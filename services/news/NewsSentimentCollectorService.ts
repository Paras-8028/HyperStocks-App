import { connectToDatabase } from '@/database/mongoose';
import {
    HistoricalSentimentLogModel,
    IHistoricalSentimentLogDocument,
} from '@/database/models/historical_sentiment_log.model';
import { HistoricalBarModel } from '@/database/models/historical_bar.model';
import { FinnhubNewsService } from '@/services/news/FinnhubNewsService';
import { WatchlistArticle } from '@/services/news/WatchlistNewsService';
import { WatchlistNewsSummarizer } from '@/services/news/WatchlistNewsSummarizer';
import { EvaluationIntegrityStatus } from '@/types/news';
import crypto from 'crypto';

export interface CollectorOptions {
    symbols?: string[];
    concurrency?: number; // default 2
    delayBetweenBatchesMs?: number; // default 350ms
    forceReassess?: boolean; // default false
    dryRun?: boolean; // default false
    analysisVersion?: string; // default '1.0.0-phase7'
    maxArticlesPerSymbol?: number; // default 5 for bounded execution
}

export interface IngestionRunSummary {
    startedAt: string;
    completedAt: string;
    symbolsProcessed: string[];
    totalArticlesRetrieved: number;
    newArticlesSaved: number;
    duplicateArticlesSkipped: number;
    failedProviderRequests: number;
    sentimentProcessingFailures: number;
    oldestCollectedTimestamp: string | null;
    newestCollectedTimestamp: string | null;
    dryRun: boolean;
    errors: string[];
}

export interface CollectionStatsReport {
    generatedAt: string;
    totalSentimentRecords: number;
    pointInTimeRecordsCount: number;
    retrospectiveRecordsCount: number;
    uniqueSymbolsCount: number;
    oldestSentimentDate: string | null;
    newestSentimentDate: string | null;
    totalHistoricalBars: number;
    symbolsWithBarCoverageCount: number;
    eligibleEvaluationEventsCount: number;
    currentEvaluationIntegrityStatus: EvaluationIntegrityStatus;
    lastRunSummary: IngestionRunSummary | null;
}

export class NewsSentimentCollectorService {
    public static readonly VERSION = '1.0.0-phase7';

    // In-memory concurrency guard to prevent overlapping ingestion runs
    private static isRunning = false;
    private static lastRunSummary: IngestionRunSummary | null = null;

    /**
     * Runs automated background collection across configured symbols.
     * Respects rate limits, performs idempotent writes, handles syndication deduplication,
     * and records point-in-time sentiment assessments.
     */
    public static async runCollection(
        symbolsToProcess?: string[],
        options: CollectorOptions = {}
    ): Promise<IngestionRunSummary> {
        const startedAt = new Date().toISOString();

        if (this.isRunning) {
            return {
                startedAt,
                completedAt: new Date().toISOString(),
                symbolsProcessed: [],
                totalArticlesRetrieved: 0,
                newArticlesSaved: 0,
                duplicateArticlesSkipped: 0,
                failedProviderRequests: 0,
                sentimentProcessingFailures: 0,
                oldestCollectedTimestamp: null,
                newestCollectedTimestamp: null,
                dryRun: !!options.dryRun,
                errors: ['Collection job already in progress. Concurrent execution skipped.'],
            };
        }

        this.isRunning = true;

        try {
            if (!options.dryRun) {
                await connectToDatabase();
            }

            const {
                concurrency = 2,
                delayBetweenBatchesMs = 350,
                forceReassess = false,
                dryRun = false,
                analysisVersion = '1.0.0-phase7',
                maxArticlesPerSymbol = 5,
            } = options;

            // 1. Resolve target symbols
            let cleanSymbols: string[] = [];
            if (symbolsToProcess && symbolsToProcess.length > 0) {
                cleanSymbols = Array.from(
                    new Set(
                        symbolsToProcess
                            .map((s) => (s || '').trim().toUpperCase())
                            .filter((s) => s.length > 0 && /^[A-Z0-9.\-_]{1,12}$/.test(s))
                    )
                );
            } else {
                // Discover active symbols from watchlists
                try {
                    const { getAllUsersForNewsEmail } = await import('@/lib/actions/user.actions');
                    const { getWatchlistStockItemsByUserId } = await import('@/lib/actions/watchlist.actions');
                    const users = await getAllUsersForNewsEmail();
                    const discovered = new Set<string>();

                    for (const u of users) {
                        const items = await getWatchlistStockItemsByUserId(u.userId);
                        items.forEach((it) => {
                            const sym = it.symbol?.trim().toUpperCase();
                            if (sym) discovered.add(sym);
                        });
                    }

                    cleanSymbols = Array.from(discovered);
                } catch (discoveryErr) {
                    console.warn('[NewsCollector] Failed to discover watchlist symbols:', discoveryErr);
                }

                if (cleanSymbols.length === 0) {
                    cleanSymbols = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN'];
                }
            }

            const summary: IngestionRunSummary = {
                startedAt,
                completedAt: '',
                symbolsProcessed: cleanSymbols,
                totalArticlesRetrieved: 0,
                newArticlesSaved: 0,
                duplicateArticlesSkipped: 0,
                failedProviderRequests: 0,
                sentimentProcessingFailures: 0,
                oldestCollectedTimestamp: null,
                newestCollectedTimestamp: null,
                dryRun,
                errors: [],
            };

            const seenCanonicalStories = new Set<string>();
            let oldestMs = Infinity;
            let newestMs = -Infinity;

            const newsService = new FinnhubNewsService();

            // 2. Process in bounded concurrent batches
            for (let i = 0; i < cleanSymbols.length; i += concurrency) {
                const batch = cleanSymbols.slice(i, i + concurrency);

                for (const symbol of batch) {
                    try {
                        const newsRes = await newsService.getCompanyNews(symbol, 7);

                        if (!newsRes.success) {
                            summary.failedProviderRequests++;
                            if ('error' in newsRes && newsRes.error) {
                                summary.errors.push(`[${symbol}] ${newsRes.error}`);
                            }
                            continue;
                        }

                        if (!newsRes.data) {
                            continue;
                        }

                        const rawArticles = newsRes.data;
                        summary.totalArticlesRetrieved += rawArticles.length;
                        const articles = rawArticles.slice(0, maxArticlesPerSymbol);

                        for (const art of articles) {
                            const articleId = String(art.id || this.generateArticleHash(art.headline, art.datetime));
                            const pubDate = new Date(art.datetime);
                            const pubMs = pubDate.getTime();

                            if (!isNaN(pubMs)) {
                                if (pubMs < oldestMs) oldestMs = pubMs;
                                if (pubMs > newestMs) newestMs = pubMs;
                            }

                            // Canonical Story ID for syndication deduplication
                            const canonicalStoryId = this.generateCanonicalStoryId(art.headline, pubDate);
                            const isSyndicatedCopy = seenCanonicalStories.has(canonicalStoryId);
                            seenCanonicalStories.add(canonicalStoryId);

                            // 3. Idempotency Check: Already recorded version 1?
                            if (!forceReassess && !dryRun) {
                                const existing = await HistoricalSentimentLogModel.findOne({
                                    symbol,
                                    articleId,
                                    version: 1,
                                }).lean();

                                if (existing) {
                                    summary.duplicateArticlesSkipped++;
                                    continue;
                                }
                            }

                            // 4. Record Sentiment Assessment
                            try {
                                const watchlistArt: WatchlistArticle = {
                                    id: articleId,
                                    headline: art.headline,
                                    summary: art.summary,
                                    source: art.source,
                                    url: art.url,
                                    datetime: art.datetime,
                                    relatedSymbols: [symbol],
                                    relatedCompanies: [],
                                    relevanceScore: 10,
                                };

                                const aiSummary = await WatchlistNewsSummarizer.summarizeArticle(watchlistArt);
                                const firstSeenAt = new Date();
                                const assessedAt = new Date();

                                if (!dryRun) {
                                    await HistoricalSentimentLogModel.findOneAndUpdate(
                                        { symbol, articleId, version: 1 },
                                        {
                                            $setOnInsert: {
                                                articleId,
                                                symbol,
                                                symbols: [symbol],
                                                headline: art.headline,
                                                summary: art.summary || '',
                                                contentUsed: aiSummary.whatHappened || art.summary || art.headline,
                                                source: art.source || 'Financial News',
                                                url: art.url || '',
                                                provider: 'finnhub',
                                                publishedAt: pubDate,
                                                firstSeenAt,
                                                assessedAt,
                                                recordedAt: new Date(),
                                                version: 1,
                                                analysisVersion,
                                                modelProvider: aiSummary.isAIGenerated ? 'gemini' : 'deterministic_fallback',
                                                provenance: 'point_in_time_recorded',
                                                isRetrospective: false,
                                                canonicalStoryId,
                                                isSyndicatedCopy,
                                                sentiment: aiSummary.sentiment || 'neutral',
                                                companySentiment: aiSummary.companySentiment || aiSummary.sentiment || 'neutral',
                                                marketSentiment: aiSummary.marketSentiment || 'neutral',
                                                sourceReliabilityScore: aiSummary.sourceReliabilityScore ?? 0.7,
                                                sourceReliabilityTier: aiSummary.confidenceDimensions?.sourceReliabilityTier || 'secondary_aggregator',
                                                sourceReliabilityRationale: aiSummary.confidenceDimensions?.sourceReliabilityRationale || '',
                                                interpretationConfidenceScore: aiSummary.interpretationConfidenceScore ?? 0.7,
                                                interpretationRationale: aiSummary.confidenceDimensions?.interpretationRationale || '',
                                                marketDirectionalUncertaintyScore: aiSummary.marketDirectionalUncertaintyScore ?? 0.5,
                                                directionalUncertaintyLevel: aiSummary.directionalUncertaintyLevel || 'moderate',
                                                directionalUncertaintyRationale: aiSummary.confidenceDimensions?.directionalUncertaintyRationale || '',
                                                confidenceDimensions: aiSummary.confidenceDimensions,
                                                whatHappened: aiSummary.whatHappened || art.summary || '',
                                                whyItMatters: aiSummary.whyItMatters || '',
                                                bottomLine: aiSummary.bottomLine || '',
                                                shortTermOutlook: aiSummary.shortTermOutlook || '',
                                                longTermConsiderations: aiSummary.longTermConsiderations || '',
                                                risks: aiSummary.risks || [],
                                                opportunities: aiSummary.opportunities || [],
                                            },
                                            $set: {
                                                lastProcessedAt: new Date(),
                                            },
                                        },
                                        { upsert: true, new: true }
                                    );
                                }

                                summary.newArticlesSaved++;
                            } catch (assessmentErr: any) {
                                summary.sentimentProcessingFailures++;
                                summary.errors.push(`[${symbol}:${articleId}] Assessment failed: ${assessmentErr?.message}`);
                            }
                        }
                    } catch (symErr: any) {
                        summary.failedProviderRequests++;
                        summary.errors.push(`[${symbol}] Ingestion error: ${symErr?.message}`);
                    }
                }

                // Throttle between batches to protect provider rate limits
                if (i + concurrency < cleanSymbols.length && delayBetweenBatchesMs > 0) {
                    await new Promise((r) => setTimeout(r, delayBetweenBatchesMs));
                }
            }

            summary.completedAt = new Date().toISOString();
            if (oldestMs !== Infinity) summary.oldestCollectedTimestamp = new Date(oldestMs).toISOString();
            if (newestMs !== -Infinity) summary.newestCollectedTimestamp = new Date(newestMs).toISOString();

            this.lastRunSummary = summary;
            return summary;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Records a reassessment version for an existing article without overwriting original assessment (version 1).
     */
    public static async recordReassessment(
        symbol: string,
        articleId: string,
        newVersion: number,
        reassessedSentiment: {
            sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
            analysisVersion: string;
            modelProvider: string;
            whyItMatters?: string;
        }
    ): Promise<IHistoricalSentimentLogDocument | null> {
        await connectToDatabase();
        const base = await HistoricalSentimentLogModel.findOne({ symbol, articleId, version: 1 }).lean();
        if (!base) return null;

        const newDoc = await HistoricalSentimentLogModel.findOneAndUpdate(
            { symbol, articleId, version: newVersion },
            {
                $set: {
                    articleId,
                    symbol,
                    symbols: base.symbols,
                    headline: base.headline,
                    summary: base.summary,
                    source: base.source,
                    url: base.url,
                    provider: base.provider,
                    publishedAt: base.publishedAt,
                    firstSeenAt: base.firstSeenAt,
                    assessedAt: new Date(),
                    recordedAt: new Date(),
                    lastProcessedAt: new Date(),
                    version: newVersion,
                    analysisVersion: reassessedSentiment.analysisVersion,
                    modelProvider: reassessedSentiment.modelProvider,
                    provenance: 'retrospective_inference', // Subsequent reassessment is retrospective
                    isRetrospective: true,
                    canonicalStoryId: base.canonicalStoryId,
                    isSyndicatedCopy: base.isSyndicatedCopy,
                    sentiment: reassessedSentiment.sentiment,
                    companySentiment: reassessedSentiment.sentiment,
                    marketSentiment: base.marketSentiment,
                    sourceReliabilityScore: base.sourceReliabilityScore,
                    interpretationConfidenceScore: base.interpretationConfidenceScore,
                    marketDirectionalUncertaintyScore: base.marketDirectionalUncertaintyScore,
                    whyItMatters: reassessedSentiment.whyItMatters || base.whyItMatters,
                },
            },
            { upsert: true, new: true }
        );

        return newDoc;
    }

    /**
     * Returns comprehensive collector monitoring and data readiness status.
     */
    public static async getCollectionStats(symbolFilter?: string): Promise<CollectionStatsReport> {
        try {
            await connectToDatabase();
        } catch {
            // DB connection fallback
        }

        const query: any = {};
        if (symbolFilter) {
            query.symbol = symbolFilter.trim().toUpperCase();
        }

        let totalSentimentRecords = 0;
        let pointInTimeRecordsCount = 0;
        let retrospectiveRecordsCount = 0;
        let uniqueSymbols: string[] = [];
        let oldestDate: Date | null = null;
        let newestDate: Date | null = null;

        try {
            totalSentimentRecords = await HistoricalSentimentLogModel.countDocuments(query);
            pointInTimeRecordsCount = await HistoricalSentimentLogModel.countDocuments({
                ...query,
                provenance: 'point_in_time_recorded',
            });
            retrospectiveRecordsCount = await HistoricalSentimentLogModel.countDocuments({
                ...query,
                provenance: 'retrospective_inference',
            });
            uniqueSymbols = await HistoricalSentimentLogModel.distinct('symbol', query);

            const oldestDoc = await HistoricalSentimentLogModel.findOne(query).sort({ publishedAt: 1 }).lean();
            const newestDoc = await HistoricalSentimentLogModel.findOne(query).sort({ publishedAt: -1 }).lean();
            if (oldestDoc) oldestDate = oldestDoc.publishedAt;
            if (newestDoc) newestDate = newestDoc.publishedAt;
        } catch (dbErr) {
            console.warn('[NewsCollector] Failed to query HistoricalSentimentLogModel stats:', dbErr);
        }

        let totalHistoricalBars = 0;
        let symbolsWithBarCoverageCount = 0;
        try {
            totalHistoricalBars = await HistoricalBarModel.countDocuments();
            const barSymbols = await HistoricalBarModel.distinct('symbol');
            symbolsWithBarCoverageCount = barSymbols.length;
        } catch (barErr) {
            console.warn('[NewsCollector] Failed to query HistoricalBarModel stats:', barErr);
        }

        let currentEvaluationIntegrityStatus: EvaluationIntegrityStatus = 'NO_HISTORICAL_RECORDS';
        if (totalSentimentRecords === 0 || totalHistoricalBars === 0) {
            currentEvaluationIntegrityStatus = 'NO_HISTORICAL_RECORDS';
        } else if (pointInTimeRecordsCount < 30) {
            currentEvaluationIntegrityStatus = 'INSUFFICIENT_OBSERVATIONS';
        } else {
            currentEvaluationIntegrityStatus = 'EVALUATION_COMPLETED_UNCERTAIN';
        }

        return {
            generatedAt: new Date().toISOString(),
            totalSentimentRecords,
            pointInTimeRecordsCount,
            retrospectiveRecordsCount,
            uniqueSymbolsCount: uniqueSymbols.length,
            oldestSentimentDate: oldestDate ? oldestDate.toISOString() : null,
            newestSentimentDate: newestDate ? newestDate.toISOString() : null,
            totalHistoricalBars,
            symbolsWithBarCoverageCount,
            eligibleEvaluationEventsCount: pointInTimeRecordsCount,
            currentEvaluationIntegrityStatus,
            lastRunSummary: this.lastRunSummary,
        };
    }

    public static getPipelineStatus() {
        return {
            isRunning: this.isRunning,
            lastRunSummary: this.lastRunSummary,
        };
    }

    public static generateCanonicalStoryId(headline: string, publishedAt: Date): string {
        const cleaned = (headline || '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/^(brief\s*[-:]|update\s*\d*\s*[-:]|exclusive\s*[-:]|breaking\s*[-:]|press release\s*[-:]|stocks to watch\s*[-:])/i, '')
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 60);
        const dateKey = publishedAt.toISOString().split('T')[0];
        return `${dateKey}_${cleaned}`;
    }

    public static generateArticleHash(headline: string, datetime: number): string {
        const hash = crypto
            .createHash('sha256')
            .update(`${headline}_${datetime}`)
            .digest('hex')
            .slice(0, 16);
        return `news-${hash}`;
    }
}
