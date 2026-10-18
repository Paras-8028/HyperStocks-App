import { NextResponse } from 'next/server';
import { getNewsService } from '@/services/news';
import { auth } from '@clerk/nextjs/server';
import { getPortfolioService } from '@/services/portfolio';
import { getPersonalizationService } from '@/services/personalization';
import { getWatchlistSymbolsByUserId } from '@/lib/actions/watchlist.actions';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode');
        const symbolsParam = searchParams.get('symbols');
        const category = searchParams.get('category') || 'general';

        const newsService = getNewsService();

        // 1. AI-Powered News Intelligence Mode
        if (mode === 'intelligence') {
            let userId: string | null = null;
            let watchlistSymbols: string[] = [];
            let portfolioSymbols: string[] = [];
            let preferredSectors: string[] = [];
            let riskTolerance: string | undefined;
            let investmentExperience: string | undefined;

            try {
                const sessionAuth = await auth();
                userId = sessionAuth.userId;
            } catch {
                // Fallback for unauthenticated views
            }

            // Resolve context if user identified
            if (userId) {
                try {
                    const [wl, portRes, prefRes] = await Promise.all([
                        getWatchlistSymbolsByUserId(userId),
                        getPortfolioService().getPositions(userId),
                        getPersonalizationService().getUserProfile(userId),
                    ]);

                    watchlistSymbols = wl || [];
                    if (portRes.success && portRes.data) {
                        portfolioSymbols = portRes.data.map((p) => p.symbol);
                    }
                    if (prefRes.success && prefRes.data) {
                        preferredSectors = prefRes.data.preferredSectors || [];
                        riskTolerance = prefRes.data.riskTolerance;
                        investmentExperience = prefRes.data.experienceLevel;
                    }
                } catch (err) {
                    console.warn('GET /api/news: Context resolution fallback', err);
                }
            }

            // If client passed explicit symbols parameter, blend them in
            if (symbolsParam) {
                const explicit = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);
                watchlistSymbols = Array.from(new Set([...watchlistSymbols, ...explicit]));
            }

            const res = await newsService.getNewsIntelligence({
                watchlistSymbols,
                portfolioSymbols,
                preferredSectors,
                riskTolerance,
                investmentExperience,
                category,
            });

            return NextResponse.json(res);
        }

        // 2. Historical Sentiment Return Evaluation Mode
        if (mode === 'evaluation') {
            const targetSymbol = (searchParams.get('symbol') || searchParams.get('symbols') || 'AAPL').trim().toUpperCase();
            try {
                const { connectToDatabase } = await import('@/database/mongoose');
                await connectToDatabase();
            } catch (dbErr) {
                console.warn('DB connection skipped in evaluation route:', dbErr);
            }

            const { HistoricalSentimentEvaluator } = await import('@/services/news/HistoricalSentimentEvaluator');

            // 1. Check for genuine persisted point-in-time sentiment records from HistoricalSentimentLogModel
            let events: any[] = [];
            try {
                const { HistoricalSentimentLogModel } = await import('@/database/models/historical_sentiment_log.model');
                const logs = await HistoricalSentimentLogModel.find({ symbol: targetSymbol, version: 1 })
                    .sort({ publishedAt: 1 })
                    .limit(200)
                    .lean();

                if (logs && logs.length > 0) {
                    events = logs.map((l) => ({
                        id: l.articleId,
                        symbol: l.symbol,
                        headline: l.headline,
                        summary: l.summary,
                        source: l.source,
                        url: l.url,
                        publishedAt: l.publishedAt,
                        recordedAt: l.recordedAt,
                        provenance: l.provenance,
                        isRetrospective: l.isRetrospective,
                        sentiment: l.sentiment,
                        sourceReliabilityScore: l.sourceReliabilityScore,
                        interpretationConfidenceScore: l.interpretationConfidenceScore,
                        marketDirectionalUncertaintyScore: l.marketDirectionalUncertaintyScore,
                    }));
                }
            } catch (dbReadErr) {
                console.warn('Could not read HistoricalSentimentLogModel:', dbReadErr);
            }

            // 2. If no persisted records exist, query live news with explicit unarchived_live provenance
            if (events.length === 0) {
                const newsRes = await newsService.getCuratedWatchlistNews([targetSymbol]);
                const articles = newsRes.success && newsRes.data ? newsRes.data : [];

                events = articles.map((a: any) => ({
                    id: String(a.id),
                    symbol: targetSymbol,
                    headline: a.headline,
                    summary: a.summary,
                    source: a.source,
                    url: a.url,
                    publishedAt: a.datetime,
                    provenance: 'unarchived_live' as const,
                    isRetrospective: false,
                    sentiment: (a.aiSentiment || a.aiSummary?.sentiment || 'neutral') as any,
                    sourceReliabilityScore: a.sourceReliabilityScore ?? a.aiSummary?.sourceReliabilityScore,
                    interpretationConfidenceScore: a.interpretationConfidenceScore ?? a.aiSummary?.interpretationConfidenceScore,
                    marketDirectionalUncertaintyScore: a.marketDirectionalUncertaintyScore ?? a.aiSummary?.marketDirectionalUncertaintyScore,
                }));
            }

            const report = await HistoricalSentimentEvaluator.evaluateFromDatabase(targetSymbol, events);
            return NextResponse.json({ success: true, data: report });
        }

        // 3. Collector Status Mode
        if (mode === 'collector_status') {
            const symbol = searchParams.get('symbol') || searchParams.get('symbols') || undefined;
            const { NewsSentimentCollectorService } = await import('@/services/news/NewsSentimentCollectorService');
            const stats = await NewsSentimentCollectorService.getCollectionStats(symbol || undefined);
            return NextResponse.json({ success: true, data: stats });
        }

        const shouldSummarize = searchParams.get('summarize') === 'true';

        // 2. Standard Ticker News
        if (symbolsParam) {
            const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);
            const res = await newsService.getCuratedWatchlistNews(symbols);

            if (res.success && res.data && shouldSummarize) {
                const { WatchlistNewsSummarizer } = await import('@/services/news/WatchlistNewsSummarizer');
                const summarized = await WatchlistNewsSummarizer.summarizeBatch(
                    res.data.map((a) => ({
                        id: String(a.id),
                        headline: a.headline,
                        summary: a.summary,
                        source: a.source,
                        url: a.url,
                        datetime: a.datetime,
                        relatedSymbols: a.relatedSymbol ? [a.relatedSymbol] : symbols,
                        relatedCompanies: [],
                        relevanceScore: 10,
                    }))
                );

                const enriched = res.data.map((art, idx) => {
                    const s = summarized[idx];
                    return {
                        ...art,
                        aiSummary: s
                            ? {
                                  whatHappened: s.whatHappened || art.summary,
                                  whyItMatters: s.whyItMatters || '',
                                  bottomLine: s.bottomLine || '',
                                  impact: s.impact || 'uncertain',
                                  sentiment: s.sentiment || 'neutral',
                                  confidenceScore: s.confidenceScore ?? 0.6,
                                  confidenceRationale: s.confidenceRationale || '',
                                  confidenceDimensions: s.confidenceDimensions,
                                  sourceReliabilityScore: s.sourceReliabilityScore ?? s.confidenceDimensions?.sourceReliabilityScore ?? 0.7,
                                  interpretationConfidenceScore: s.interpretationConfidenceScore ?? s.confidenceDimensions?.interpretationConfidenceScore ?? 0.7,
                                  marketDirectionalUncertaintyScore: s.marketDirectionalUncertaintyScore ?? s.confidenceDimensions?.marketDirectionalUncertaintyScore ?? 0.5,
                                  directionalUncertaintyLevel: s.directionalUncertaintyLevel ?? s.confidenceDimensions?.directionalUncertaintyLevel ?? 'moderate',
                                  companySentiment: s.companySentiment || s.sentiment || 'neutral',
                                  marketSentiment: s.marketSentiment || 'neutral',
                                  shortTermOutlook: s.shortTermOutlook || '',
                                  longTermConsiderations: s.longTermConsiderations || '',
                                  affectedEntity: s.affectedEntity || {
                                      name: art.relatedSymbol || 'Tracked Asset',
                                      type: 'company',
                                      symbol: art.relatedSymbol,
                                  },
                                  risks: s.risks || [],
                                  opportunities: s.opportunities || [],
                                  isAIGenerated: s.isAIGenerated ?? false,
                                  isFallback: s.isFallback ?? true,
                                  sourceEvidence: s.sourceEvidence || {
                                      headline: art.headline,
                                      source: art.source,
                                      url: art.url,
                                      datetime: art.datetime,
                                  },
                              }
                            : undefined,
                    };
                });

                return NextResponse.json({ success: true, data: enriched });
            }

            return NextResponse.json(res);
        }

        // 3. General Raw Market News
        const res = await newsService.getMarketNews(category);
        if (res.success && res.data && shouldSummarize) {
            const { WatchlistNewsSummarizer } = await import('@/services/news/WatchlistNewsSummarizer');
            const summarized = await WatchlistNewsSummarizer.summarizeBatch(
                res.data.map((a) => ({
                    id: String(a.id),
                    headline: a.headline,
                    summary: a.summary,
                    source: a.source,
                    url: a.url,
                    datetime: a.datetime,
                    relatedSymbols: a.relatedSymbol ? [a.relatedSymbol] : [],
                    relatedCompanies: [],
                    relevanceScore: 10,
                }))
            );

            const enriched = res.data.map((art, idx) => {
                const s = summarized[idx];
                return {
                    ...art,
                    aiSummary: s
                        ? {
                              whatHappened: s.whatHappened || art.summary,
                              whyItMatters: s.whyItMatters || '',
                              bottomLine: s.bottomLine || '',
                              impact: s.impact || 'uncertain',
                              sentiment: s.sentiment || 'neutral',
                              confidenceScore: s.confidenceScore ?? 0.6,
                              confidenceRationale: s.confidenceRationale || '',
                              confidenceDimensions: s.confidenceDimensions,
                              sourceReliabilityScore: s.sourceReliabilityScore ?? s.confidenceDimensions?.sourceReliabilityScore ?? 0.7,
                              interpretationConfidenceScore: s.interpretationConfidenceScore ?? s.confidenceDimensions?.interpretationConfidenceScore ?? 0.7,
                              marketDirectionalUncertaintyScore: s.marketDirectionalUncertaintyScore ?? s.confidenceDimensions?.marketDirectionalUncertaintyScore ?? 0.5,
                              directionalUncertaintyLevel: s.directionalUncertaintyLevel ?? s.confidenceDimensions?.directionalUncertaintyLevel ?? 'moderate',
                              companySentiment: s.companySentiment || s.sentiment || 'neutral',
                              marketSentiment: s.marketSentiment || 'neutral',
                              shortTermOutlook: s.shortTermOutlook || '',
                              longTermConsiderations: s.longTermConsiderations || '',
                              affectedEntity: s.affectedEntity || {
                                  name: art.relatedSymbol || 'Market',
                                  type: 'market',
                                  symbol: art.relatedSymbol,
                              },
                              risks: s.risks || [],
                              opportunities: s.opportunities || [],
                              isAIGenerated: s.isAIGenerated ?? false,
                              isFallback: s.isFallback ?? true,
                              sourceEvidence: s.sourceEvidence || {
                                  headline: art.headline,
                                  source: art.source,
                                  url: art.url,
                                  datetime: art.datetime,
                              },
                          }
                        : undefined,
                };
            });

            return NextResponse.json({ success: true, data: enriched });
        }

        return NextResponse.json(res);
    } catch (err: any) {
        console.error('GET /api/news error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to fetch news' },
            { status: 500 }
        );
    }
}
