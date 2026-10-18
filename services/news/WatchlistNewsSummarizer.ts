import { WatchlistArticle } from './WatchlistNewsService';
import { getAIService } from '@/services/ai';
import { AI_CONFIG } from '@/config/ai';
import { aiCooldownTracker } from '@/services/ai/aiErrorHandling';
import { NewsConfidenceDimensions, NewsSentimentClass } from '@/types/news';
import crypto from 'crypto';

export interface ArticleSummaryContent {
    whatHappened: string;
    whyItMatters: string;
    bottomLine: string;
    impact: 'positive' | 'negative' | 'mixed' | 'uncertain';
    sentiment: NewsSentimentClass;
    confidenceScore: number; // Backwards-compatible alias for interpretation confidence
    confidenceRationale: string;
    // Phase 1: Separated Confidence Dimensions
    confidenceDimensions: NewsConfidenceDimensions;
    sourceReliabilityScore: number;
    interpretationConfidenceScore: number;
    marketDirectionalUncertaintyScore: number;
    directionalUncertaintyLevel: 'low' | 'moderate' | 'high' | 'extreme';
    companySentiment: NewsSentimentClass;
    marketSentiment: NewsSentimentClass;
    shortTermOutlook: string;
    longTermConsiderations: string;
    affectedEntity: {
        name: string;
        type: 'company' | 'sector' | 'market';
        symbol?: string;
    };
    risks: string[];
    opportunities: string[];
    isAIGenerated: boolean;
    isFallback?: boolean;
    sourceEvidence?: {
        headline: string;
        source: string;
        url: string;
        datetime: number;
    };
}

export class ConfidenceDimensionService {
    /**
     * Evaluates source reliability based on publisher tier, editorial standards,
     * and whether the outlet is a primary wire or syndicated aggregator.
     */
    public static evaluateSourceReliability(sourceName: string, url: string): {
        score: number;
        tier: 'tier_1_wire' | 'institutional_press' | 'secondary_aggregator' | 'unverified';
        rationale: string;
    } {
        const s = (sourceName || '').toLowerCase();
        const u = (url || '').toLowerCase();

        if (/\b(reuters|bloomberg|wall street journal|wsj|financial times|ft\.com|sec\.gov|edgar)\b/.test(s) ||
            /\b(reuters\.com|bloomberg\.com|wsj\.com|ft\.com|sec\.gov)\b/.test(u)) {
            return {
                score: 0.95,
                tier: 'tier_1_wire',
                rationale: 'Tier-1 primary financial wire with institutional editorial verification and strict fact-checking standards.',
            };
        }

        if (/\b(cnbc|marketwatch|barron'?s|associated press|ap news|forbes|fortune|business wire|globenewswire|prnewswire|silicon herald)\b/.test(s) ||
            /\b(cnbc\.com|marketwatch\.com|barrons\.com|apnews\.com|businesswire\.com|globenewswire\.com|prnewswire\.com)\b/.test(u)) {
            return {
                score: 0.82,
                tier: 'institutional_press',
                rationale: 'Established financial publication or verified corporate press wire service.',
            };
        }

        if (/\b(benzinga|seeking alpha|the motley fool|investorplace|yahoo|investing\.com|thestreet|tipranks|tech daily|auto news|biopharma dive|techcrunch)\b/.test(s) ||
            /\b(benzinga\.com|seekingalpha\.com|fool\.com|yahoo\.com|investing\.com)\b/.test(u)) {
            return {
                score: 0.68,
                tier: 'secondary_aggregator',
                rationale: 'Secondary financial news aggregator, trade vertical, or contributor network.',
            };
        }

        return {
            score: 0.40,
            tier: 'unverified',
            rationale: 'Unverified blog, generic wire snippet, or unauthenticated syndicate feed.',
        };
    }

    /**
     * Evaluates interpretation confidence based on factual grounding, lexical clarity,
     * and presence of verifiable quantitative metrics vs ambiguous rumors.
     */
    public static evaluateInterpretationConfidence(headline: string, summary: string, hasCatalyst: boolean, isMixed: boolean): {
        score: number;
        rationale: string;
    } {
        const text = `${headline} ${summary}`.toLowerCase();

        if (!headline || headline.trim().length < 15 || text.includes('click here') || summary.trim().length === 0) {
            return {
                score: 0.35,
                rationale: 'Source content is sparse or incomplete; interpretation confidence is limited to headline token parsing.',
            };
        }

        if (isMixed) {
            return {
                score: 0.70,
                rationale: 'Contradictory catalysts detected between operational execution and emerging risk headwinds; interpretation reflects nuanced cross-currents.',
            };
        }

        if (/\b(reported quarterly|revenue of \$|eps of \$|net income|sec filing|form 10-k|form 10-q|form 8-k|approved by fda)\b/i.test(text)) {
            return {
                score: 0.90,
                rationale: 'High interpretation certainty: announcement cites verifiable financial figures, regulatory filings, or audited corporate releases.',
            };
        }

        if (hasCatalyst) {
            return {
                score: 0.85,
                rationale: 'Clear directional corporate catalyst identified with unambiguous operational semantics.',
            };
        }

        return {
            score: 0.60,
            rationale: 'Informational report without acute catalyst; interpreted as standard operational flow.',
        };
    }

    /**
     * Evaluates market directional uncertainty.
     * CRITICAL PRINCIPLE: Source authority and high interpretation clarity do NOT guarantee
     * stock price movement direction or magnitude.
     */
    public static evaluateMarketDirectionalUncertainty(
        sentiment: NewsSentimentClass,
        hasMacroContext: boolean,
        isMixed: boolean
    ): {
        score: number;
        level: 'low' | 'moderate' | 'high' | 'extreme';
        rationale: string;
    } {
        if (isMixed || sentiment === 'mixed') {
            return {
                score: 0.85,
                level: 'extreme',
                rationale: 'Extreme directional uncertainty: conflicting positive and negative drivers create high return variance and unpredictable market response.',
            };
        }

        if (hasMacroContext) {
            return {
                score: 0.70,
                level: 'high',
                rationale: 'High directional uncertainty: macroeconomic rate or inflation factors can override or delay micro company catalysts.',
            };
        }

        if (sentiment === 'bullish' || sentiment === 'bearish') {
            return {
                score: 0.50,
                level: 'moderate',
                rationale: 'Moderate directional uncertainty: directional thesis is supported by article evidence, but subsequent market returns depend on prior expectations, market breadth, and sector pricing.',
            };
        }

        return {
            score: 0.40,
            level: 'low',
            rationale: 'Low directional variance expected from routine informational announcements in the absence of acute surprises.',
        };
    }

    public static readonly CALIBRATION_DISCLAIMER =
        'Heuristic multi-dimensional scores derived from source tier and textual indicators. These scores are not statistically calibrated posterior probabilities and have not been fitted to labeled historical outcome distributions.';
}

// In-memory cache across user batches in the same scheduled run
const summaryCache = new Map<string, { summary: ArticleSummaryContent; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class WatchlistNewsSummarizer {
    /**
     * Computes a deterministic cache key based on article content, active model, and prompt version.
     */
    public static computeCacheKey(article: WatchlistArticle): string {
        const text = `${(article.headline || '').trim()}::${(article.summary || '').trim()}`;
        const contentHash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 24);
        return `ai_summary:v1.0.0:${AI_CONFIG.defaultModel}:${contentHash}`;
    }

    /**
     * Rehydrates an ArticleSummaryContent from a previously persisted point-in-time sentiment log.
     */
    private static rehydrateSummaryFromLog(
        log: any,
        article: WatchlistArticle
    ): ArticleSummaryContent {
        const sentiment: NewsSentimentClass = log.sentiment || 'neutral';
        const impactMap: Record<NewsSentimentClass, 'positive' | 'negative' | 'mixed' | 'uncertain'> = {
            bullish: 'positive',
            bearish: 'negative',
            mixed: 'mixed',
            neutral: 'uncertain',
        };

        const sourceRel = ConfidenceDimensionService.evaluateSourceReliability(article.source, article.url);
        const hasCatalyst = sentiment === 'bullish' || sentiment === 'bearish';
        const isMixed = sentiment === 'mixed';
        const interpEval = ConfidenceDimensionService.evaluateInterpretationConfidence(
            article.headline,
            article.summary || '',
            hasCatalyst,
            isMixed
        );
        const dirUncertainty = ConfidenceDimensionService.evaluateMarketDirectionalUncertainty(
            sentiment,
            log.marketSentiment !== 'neutral',
            isMixed
        );

        return {
            whatHappened: log.contentUsed || article.headline,
            whyItMatters: log.whyItMatters || '',
            bottomLine: log.bottomLine || 'Stored from prior point-in-time assessment.',
            impact: impactMap[sentiment] || 'uncertain',
            sentiment,
            confidenceScore: log.interpretationConfidenceScore ?? interpEval.score,
            confidenceRationale: 'Rehydrated from point-in-time persisted sentiment log (version 1).',
            confidenceDimensions: {
                sourceReliabilityScore: log.sourceReliabilityScore ?? sourceRel.score,
                sourceReliabilityTier: sourceRel.tier,
                sourceReliabilityRationale: sourceRel.rationale,
                interpretationConfidenceScore: log.interpretationConfidenceScore ?? interpEval.score,
                interpretationRationale: 'Point-in-time persisted assessment',
                marketDirectionalUncertaintyScore: log.marketDirectionalUncertaintyScore ?? dirUncertainty.score,
                directionalUncertaintyLevel: dirUncertainty.level,
                directionalUncertaintyRationale: dirUncertainty.rationale,
                calibrationDisclaimer: ConfidenceDimensionService.CALIBRATION_DISCLAIMER,
            },
            sourceReliabilityScore: log.sourceReliabilityScore ?? sourceRel.score,
            interpretationConfidenceScore: log.interpretationConfidenceScore ?? interpEval.score,
            marketDirectionalUncertaintyScore: log.marketDirectionalUncertaintyScore ?? dirUncertainty.score,
            directionalUncertaintyLevel: dirUncertainty.level,
            companySentiment: log.companySentiment || sentiment,
            marketSentiment: log.marketSentiment || 'neutral',
            shortTermOutlook: log.shortTermOutlook || 'From point-in-time assessment',
            longTermConsiderations: log.longTermConsiderations || 'From point-in-time assessment',
            affectedEntity: {
                name: (article.relatedCompanies && article.relatedCompanies[0]) || article.relatedSymbols[0] || 'Tracked Entity',
                type: 'company',
                symbol: article.relatedSymbols[0] || undefined,
            },
            risks: log.risks || [],
            opportunities: log.opportunities || [],
            isAIGenerated: log.modelProvider !== 'deterministic',
            isFallback: log.modelProvider === 'deterministic',
            sourceEvidence: {
                headline: log.headline,
                source: log.source,
                url: log.url,
                datetime: log.publishedAt ? new Date(log.publishedAt).getTime() : article.datetime,
            },
        };
    }

    /**
     * Summarizes an article for the Watchlist news feed and email dispatch.
     * Uses in-memory cache to prevent duplicate AI calls across users tracking the same ticker or story.
     * Gracefully falls back to high-fidelity deterministic synthesis if AI is unavailable or quota is exhausted.
     */
    static async summarizeArticle(
        article: WatchlistArticle,
        forceRefresh = false
    ): Promise<ArticleSummaryContent> {
        const cacheKey = this.computeCacheKey(article);
        const legacyKey = article.id || article.url || article.headline;
        const now = Date.now();

        // 1. Check in-memory cache
        if (!forceRefresh) {
            const cached = summaryCache.get(cacheKey) || summaryCache.get(legacyKey);
            if (cached && now - cached.timestamp < CACHE_TTL_MS) {
                return cached.summary;
            }
        }

        // 2. Check MongoDB for previously stored point-in-time assessment
        if (!forceRefresh && article.id) {
            try {
                const { HistoricalSentimentLogModel } = await import('@/database/models/historical_sentiment_log.model');
                const existingLog = await HistoricalSentimentLogModel.findOne({
                    $or: [
                        { articleId: article.id, version: 1 },
                        { url: article.url, version: 1 },
                    ],
                }).lean();

                if (existingLog && existingLog.whyItMatters) {
                    const rehydrated = this.rehydrateSummaryFromLog(existingLog, article);
                    summaryCache.set(cacheKey, { summary: rehydrated, timestamp: now });
                    return rehydrated;
                }
            } catch {
                // MongoDB optional check fallback
            }
        }

        // 3. Check if Gemini is in active cooldown (e.g. quota exhausted or rate limited)
        const activeCooldown = aiCooldownTracker.getActiveCooldownError();
        if (activeCooldown) {
            const fallback = this.generateFallbackSummary(article);
            summaryCache.set(cacheKey, { summary: fallback, timestamp: now });
            return fallback;
        }

        let summary: ArticleSummaryContent;

        try {
            const aiResult = await this.callGeminiSummarizer(article);
            if (aiResult) {
                summary = aiResult;
            } else {
                summary = this.generateFallbackSummary(article);
            }
        } catch (err) {
            console.warn(`[WatchlistNewsSummarizer] AI summarization failed for "${article.headline}". Using fallback.`, err);
            summary = this.generateFallbackSummary(article);
        }

        summaryCache.set(cacheKey, { summary, timestamp: now });
        return summary;
    }

    /**
     * Batch summarize articles with cross-article deduplication and bounded execution.
     */
    static async summarizeBatch(
        articles: WatchlistArticle[]
    ): Promise<WatchlistArticle[]> {
        const results: WatchlistArticle[] = [];
        const batchCache = new Map<string, ArticleSummaryContent>();

        for (const art of articles) {
            const key = this.computeCacheKey(art);
            let summary: ArticleSummaryContent;

            if (batchCache.has(key)) {
                // Re-use already processed analysis for identical stories appearing across tickers
                summary = batchCache.get(key)!;
            } else {
                summary = await this.summarizeArticle(art);
                batchCache.set(key, summary);
            }

            results.push({
                ...art,
                whatHappened: summary.whatHappened,
                whyItMatters: summary.whyItMatters,
                bottomLine: summary.bottomLine,
                impact: summary.impact,
                sentiment: summary.sentiment,
                confidenceScore: summary.confidenceScore,
                confidenceRationale: summary.confidenceRationale,
                confidenceDimensions: summary.confidenceDimensions,
                sourceReliabilityScore: summary.sourceReliabilityScore,
                interpretationConfidenceScore: summary.interpretationConfidenceScore,
                marketDirectionalUncertaintyScore: summary.marketDirectionalUncertaintyScore,
                directionalUncertaintyLevel: summary.directionalUncertaintyLevel,
                companySentiment: summary.companySentiment,
                marketSentiment: summary.marketSentiment,
                shortTermOutlook: summary.shortTermOutlook,
                longTermConsiderations: summary.longTermConsiderations,
                affectedEntity: summary.affectedEntity,
                risks: summary.risks,
                opportunities: summary.opportunities,
                isAIGenerated: summary.isAIGenerated,
                isFallback: summary.isFallback,
            });
        }

        return results;
    }

    /**
     * Direct Gemini call with structured JSON output instructions
     */
    private static async callGeminiSummarizer(
        article: WatchlistArticle
    ): Promise<ArticleSummaryContent | null> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return null;
        }

        const primarySymbol = article.relatedSymbols[0] || '';
        const primaryCompany = article.relatedCompanies[0] || primarySymbol || 'Tracked Company';

        const systemPrompt = `You are an institutional financial journalist and intelligence analyst for HyperStocks.
Your task is to analyze verified financial news for investors tracking specific stocks.

CRITICAL RULES & CONSTRAINTS:
1. Summarize ONLY information directly supported by the provided headline, summary text, and metadata.
2. DO NOT invent missing numbers, quarterly figures, quotes, executive names, rumors, price targets, returns, probabilities, or fictional future events.
3. Classify sentiment as strictly one of: "bullish", "bearish", "neutral", or "mixed".
   - "mixed" is appropriate when there are contradictory dynamics (e.g. revenue beat paired with lower forward guidance, or strong earnings paired with a regulatory investigation).
   - "neutral" is appropriate for routine administrative updates or when source text is insufficient.
4. Calculate an interpretation confidence score between 0.0 and 1.0 calibrated to source clarity:
   - 0.80 to 1.00: High certainty (direct company filings, audited earnings, official regulatory rulings).
   - 0.55 to 0.79: Moderate certainty (analyst coverage, secondary reporting, mixed signals).
   - 0.30 to 0.54: Low certainty (sparse text, rumors, unverified wire snippets).
5. Distinguish company-specific sentiment from overall market sentiment.
6. Separate short-term implications (days/weeks) from longer-term structural considerations (quarters/years).
7. Identify verified risks and opportunities supported directly by the text.
8. Maintain an evidence-based, professional tone. Return strictly raw JSON matching this schema:
{
  "sentiment": "bullish" | "bearish" | "neutral" | "mixed",
  "confidenceScore": 0.85,
  "confidenceRationale": "Concise 1-sentence rationale for the interpretation confidence score and sentiment.",
  "companySentiment": "bullish" | "bearish" | "neutral" | "mixed",
  "marketSentiment": "bullish" | "bearish" | "neutral" | "mixed",
  "whatHappened": "1 to 2 concise sentences describing the factual event.",
  "whyItMatters": "1 to 2 sentences explaining operational or financial impact.",
  "shortTermOutlook": "1 sentence on near-term trading or operational implications.",
  "longTermConsiderations": "1 sentence on multi-quarter strategic positioning or risk.",
  "affectedEntity": {
    "name": "${primaryCompany}",
    "type": "company",
    "symbol": "${primarySymbol}"
  },
  "risks": ["Risk 1", "Risk 2"],
  "opportunities": ["Opportunity 1", "Opportunity 2"],
  "bottomLine": "1 sentence takeaway for investors."
}`;

        const userPrompt = `Analyze and summarize this verified news item for investors tracking: ${article.relatedSymbols.join(', ')} (${article.relatedCompanies.join(', ')})

Headline: ${article.headline}
Source: ${article.source}
Date: ${article.datetime ? new Date(article.datetime).toISOString().split('T')[0] : 'Recent'}
Article Description: ${article.summary || 'No further description available.'}
Article URL: ${article.url}`;

        const aiService = getAIService();
        const completionRes = await aiService.generateCompletion(userPrompt, systemPrompt);

        if (!completionRes.success || !completionRes.data) {
            return null;
        }

        const rawText = completionRes.data.trim();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return null;
        }

        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (
                typeof parsed.whatHappened === 'string' &&
                typeof parsed.whyItMatters === 'string'
            ) {
                const validSentiments: NewsSentimentClass[] = ['bullish', 'bearish', 'neutral', 'mixed'];
                const sentiment: NewsSentimentClass = validSentiments.includes(parsed.sentiment)
                    ? parsed.sentiment
                    : 'neutral';

                const companySentiment: NewsSentimentClass = validSentiments.includes(parsed.companySentiment)
                    ? parsed.companySentiment
                    : sentiment;

                const marketSentiment: NewsSentimentClass = validSentiments.includes(parsed.marketSentiment)
                    ? parsed.marketSentiment
                    : 'neutral';

                // Evaluate separated confidence dimensions
                const sourceRel = ConfidenceDimensionService.evaluateSourceReliability(article.source, article.url);
                const hasCatalyst = sentiment === 'bullish' || sentiment === 'bearish';
                const isMixed = sentiment === 'mixed';
                const interpEval = ConfidenceDimensionService.evaluateInterpretationConfidence(
                    article.headline,
                    article.summary || '',
                    hasCatalyst,
                    isMixed
                );

                const hasMacroContext = marketSentiment !== 'neutral' || /\b(fed|rate|inflation|treasury)\b/i.test(`${article.headline} ${article.summary}`);
                const dirUncertainty = ConfidenceDimensionService.evaluateMarketDirectionalUncertainty(
                    sentiment,
                    hasMacroContext,
                    isMixed
                );

                let interpretationScore = typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : interpEval.score;
                if (isNaN(interpretationScore)) interpretationScore = interpEval.score;
                interpretationScore = Math.max(0.0, Math.min(1.0, Number(interpretationScore.toFixed(2))));

                const confidenceDimensions: NewsConfidenceDimensions = {
                    sourceReliabilityScore: sourceRel.score,
                    sourceReliabilityTier: sourceRel.tier,
                    sourceReliabilityRationale: sourceRel.rationale,
                    interpretationConfidenceScore: interpretationScore,
                    interpretationRationale: typeof parsed.confidenceRationale === 'string'
                        ? parsed.confidenceRationale.trim()
                        : interpEval.rationale,
                    marketDirectionalUncertaintyScore: dirUncertainty.score,
                    directionalUncertaintyLevel: dirUncertainty.level,
                    directionalUncertaintyRationale: dirUncertainty.rationale,
                    calibrationDisclaimer: ConfidenceDimensionService.CALIBRATION_DISCLAIMER,
                };

                const impactMap: Record<NewsSentimentClass, 'positive' | 'negative' | 'mixed' | 'uncertain'> = {
                    bullish: 'positive',
                    bearish: 'negative',
                    mixed: 'mixed',
                    neutral: 'uncertain',
                };

                return {
                    whatHappened: parsed.whatHappened.trim(),
                    whyItMatters: parsed.whyItMatters.trim(),
                    bottomLine: typeof parsed.bottomLine === 'string' ? parsed.bottomLine.trim() : parsed.whyItMatters.trim(),
                    impact: impactMap[sentiment],
                    sentiment,
                    confidenceScore: interpretationScore,
                    confidenceRationale: confidenceDimensions.interpretationRationale,
                    confidenceDimensions,
                    sourceReliabilityScore: sourceRel.score,
                    interpretationConfidenceScore: interpretationScore,
                    marketDirectionalUncertaintyScore: dirUncertainty.score,
                    directionalUncertaintyLevel: dirUncertainty.level,
                    companySentiment,
                    marketSentiment,
                    shortTermOutlook: typeof parsed.shortTermOutlook === 'string'
                        ? parsed.shortTermOutlook.trim()
                        : 'Monitor subsequent price action and volume confirmation over coming sessions.',
                    longTermConsiderations: typeof parsed.longTermConsiderations === 'string'
                        ? parsed.longTermConsiderations.trim()
                        : 'Review upcoming quarterly disclosures for structural durability.',
                    affectedEntity: {
                        name: parsed.affectedEntity?.name || primaryCompany,
                        type: parsed.affectedEntity?.type === 'sector' ? 'sector' : 'company',
                        symbol: parsed.affectedEntity?.symbol || primarySymbol || undefined,
                    },
                    risks: Array.isArray(parsed.risks) ? parsed.risks.map((r: any) => String(r).trim()).filter(Boolean) : [],
                    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities.map((o: any) => String(o).trim()).filter(Boolean) : [],
                    isAIGenerated: true,
                    isFallback: false,
                    sourceEvidence: {
                        headline: article.headline,
                        source: article.source,
                        url: article.url,
                        datetime: article.datetime,
                    },
                };
            }
        } catch {
            return null;
        }

        return null;
    }

    /**
     * Deterministic, high-fidelity fallback summary generator.
     * Uses headline, description, and catalyst analysis.
     * Guaranteed to work even when offline, quota exhausted, or API down.
     * Separates Source Reliability, Interpretation Confidence, and Market Directional Uncertainty.
     */
    public static generateFallbackSummary(
        article: WatchlistArticle
    ): ArticleSummaryContent {
        const headline = (article.headline || '').trim();
        const summaryText = (article.summary || '').trim();
        const text = `${headline} ${summaryText}`.toLowerCase();

        const primarySymbol = (article.relatedSymbols && article.relatedSymbols[0]) || '';
        const companies = article.relatedCompanies && article.relatedCompanies.length > 0
            ? article.relatedCompanies.join(' and ')
            : primarySymbol || 'Tracked Entity';

        const sourceEvidence = {
            headline: article.headline,
            source: article.source || 'Financial News',
            url: article.url || '#',
            datetime: article.datetime || Date.now(),
        };

        const sourceRel = ConfidenceDimensionService.evaluateSourceReliability(article.source, article.url);

        // 1. Missing or Sparse Source Material Detection
        if (!headline || headline.length < 15 || headline.toLowerCase().includes('click here') || text.includes('no further description')) {
            const interpEval = ConfidenceDimensionService.evaluateInterpretationConfidence(headline, summaryText, false, false);
            const dirUncertainty = ConfidenceDimensionService.evaluateMarketDirectionalUncertainty('neutral', false, false);

            const confidenceDimensions: NewsConfidenceDimensions = {
                sourceReliabilityScore: sourceRel.score,
                sourceReliabilityTier: sourceRel.tier,
                sourceReliabilityRationale: sourceRel.rationale,
                interpretationConfidenceScore: interpEval.score,
                interpretationRationale: interpEval.rationale,
                marketDirectionalUncertaintyScore: dirUncertainty.score,
                directionalUncertaintyLevel: dirUncertainty.level,
                directionalUncertaintyRationale: dirUncertainty.rationale,
                calibrationDisclaimer: ConfidenceDimensionService.CALIBRATION_DISCLAIMER,
            };

            return {
                whatHappened: headline ? `${headline}${/[.!?]$/.test(headline) ? '' : '.'}` : 'Market news item received with minimal source content.',
                whyItMatters: `Source material is insufficient to evaluate detailed operational or financial impact for ${companies}.`,
                bottomLine: 'Awaiting primary company disclosures or subsequent wire confirmations.',
                impact: 'uncertain',
                sentiment: 'neutral',
                confidenceScore: interpEval.score,
                confidenceRationale: interpEval.rationale,
                confidenceDimensions,
                sourceReliabilityScore: sourceRel.score,
                interpretationConfidenceScore: interpEval.score,
                marketDirectionalUncertaintyScore: dirUncertainty.score,
                directionalUncertaintyLevel: dirUncertainty.level,
                companySentiment: 'neutral',
                marketSentiment: 'neutral',
                shortTermOutlook: 'Monitor subsequent company filings or news releases for verifiable details.',
                longTermConsiderations: 'Insufficient data to evaluate multi-quarter operational trajectory.',
                affectedEntity: {
                    name: companies,
                    type: 'company',
                    symbol: primarySymbol || undefined,
                },
                risks: [],
                opportunities: [],
                isAIGenerated: false,
                isFallback: true,
                sourceEvidence,
            };
        }

        // 2. Factual Summary Extraction
        let whatHappened: string;
        if (summaryText.length > 40 && !summaryText.toLowerCase().includes('click here')) {
            whatHappened = summaryText;
            if (!/[.!?]$/.test(whatHappened)) whatHappened += '.';
        } else {
            whatHappened = `${headline}${/[.!?]$/.test(headline) ? '' : '.'}`;
        }

        // 3. Catalyst Detection for Corporate vs Macro Signals
        const hasCorporatePositive =
            /\b(beats?|surpasses?|outperforms?|surges?|jumps?|soars?|record|raises? guidance|raised? guidance|revenue beat|eps beat|tops? estimates|strong earnings|profit jumps?|growth surge|dividend hike|breakthrough|approval|contract win|buy rating|upgrade)\b/i.test(text);

        const hasCorporateNegative =
            /\b(losses?|miss(es|ed)?|slashes? guidance|slashed? guidance|lowers? guidance|lowered? guidance|downgrades?|underperforms?|disappoints?|plunges?|drops?|falls?|lawsuit|investigation|antitrust|subpoena|penalty|fine|probe|sec|deficit)\b/i.test(text);

        const hasMacroNegative = /\b(federal reserve|fed|inflation|interest rate|treasury|yields?|macro|gdp|cpi|rate hike|rate warning)\b/i.test(text) &&
            /\b(hike|warning|concern|fear|pressure|slowdown|recession|drag|weigh)\b/i.test(text);

        const hasMacroPositive = /\b(federal reserve|fed|macro|gdp)\b/i.test(text) &&
            /\b(cut|easing|rally|stimulus|expansion)\b/i.test(text);

        const hasMacroContext = hasMacroNegative || hasMacroPositive || /\b(federal reserve|fed|inflation|interest rate|treasury|yields?|macro|gdp|cpi)\b/i.test(text);

        let sentiment: NewsSentimentClass = 'neutral';
        let companySentiment: NewsSentimentClass = 'neutral';
        let marketSentiment: NewsSentimentClass = 'neutral';
        let whyItMatters = `This development directly affects ${companies}'s operations and strategic market positioning.`;
        let bottomLine = 'Investors will monitor subsequent regulatory filings and company updates for further clarity.';
        let shortTermOutlook = 'Price action is expected to reflect reaction to this announcement over coming trading sessions.';
        let longTermConsiderations = `Assess how this development affects ${companies}'s multi-quarter competitive moat and capital allocation.`;
        let risks: string[] = [];
        let opportunities: string[] = [];

        // Scenario A: Company Bullish but Macro Headwinds (Divergent Context)
        if (hasCorporatePositive && hasMacroNegative && !hasCorporateNegative) {
            companySentiment = 'bullish';
            marketSentiment = 'bearish';
            sentiment = 'bullish';
            whyItMatters = `Strong corporate execution provides operational resilience for ${companies}, even as broader macro sentiment remains cautious.`;
            bottomLine = `Track whether company-specific growth outpaces broader sector valuation headwinds.`;
            shortTermOutlook = 'Company-level momentum may face macro resistance or broader sector multiple pressure.';
            longTermConsiderations = `Durable organic demand strengthens ${companies}'s relative competitive positioning against macro peers.`;
            risks = ['Macro interest rate pressure or valuation multiple compression across the sector'];
            opportunities = ['Market share gains and earnings resilience proving independent of macro cycles'];
        }
        // Scenario B: Contradictory / Mixed Corporate News
        else if (hasCorporatePositive && hasCorporateNegative) {
            sentiment = 'mixed';
            companySentiment = 'mixed';
            marketSentiment = hasMacroContext ? 'mixed' : 'neutral';
            whyItMatters = `Cross-currents in operational execution and headwind factors create offsetting influences for ${companies}.`;
            bottomLine = `Investors should balance headline catalysts against emerging risk exposures.`;
            shortTermOutlook = 'Expect near-term price volatility as market participants digest conflicting performance and risk drivers.';
            longTermConsiderations = 'Durability depends on management resolving risk headwinds while sustaining underlying operational gains.';
            risks = [
                'Risk of headline overhang or guidance revisions tempering initial positive metrics',
                'Uncertainty regarding duration and cost of resolving identified headwinds',
            ];
            opportunities = [
                'Underlying core business resilience demonstrates revenue-generating capacity',
                'Potential valuation multiple expansion if headwinds are successfully mitigated',
            ];
        }
        // Scenario C: Clearly Bullish Corporate News
        else if (hasCorporatePositive) {
            sentiment = 'bullish';
            companySentiment = 'bullish';
            marketSentiment = hasMacroPositive ? 'bullish' : 'neutral';
            whyItMatters = `Favorable corporate catalysts support revenue durability, operational expansion, and cash flow stability for ${companies}.`;
            bottomLine = `Watch upcoming margin metrics, guidance revisions, and earnings execution for further clarity.`;
            shortTermOutlook = 'Potential upside momentum or estimate revisions following constructive corporate announcement.';
            longTermConsiderations = `Continued operational execution reinforces competitive moat and multi-quarter margin structure.`;
            risks = [
                'Execution risks during production scaling or market deployment',
                'Broader macro market headwinds potentially moderating sentiment',
            ];
            opportunities = [
                'Operating leverage and margin expansion from accelerating demand',
                'Potential for institutional analyst consensus target revisions',
            ];
        }
        // Scenario D: Clearly Bearish Corporate News
        else if (hasCorporateNegative) {
            sentiment = 'bearish';
            companySentiment = 'bearish';
            marketSentiment = hasMacroContext ? 'bearish' : 'neutral';
            whyItMatters = `Regulatory scrutiny and legal challenges or subdued financial metrics may exert pressure on near-term valuation multiples for ${companies}.`;
            bottomLine = `Investors should track management cost-containment measures, regulatory responses, and next-quarter performance targets for clarity.`;
            shortTermOutlook = 'Near-term downside risk or cautious sentiment while market quantifies potential operational impact.';
            longTermConsiderations = 'Monitor structural adjustments, balance sheet resilience, and potential strategic restructuring.';
            risks = [
                'Downside multiple compression and downward revisions to future consensus estimates',
                'Potential compliance, financial, or litigation liabilities',
            ];
            opportunities = [
                'Strategic restructuring or cost-optimization initiatives',
                'Potential mean-reversion opportunity once regulatory or operational headwinds clear',
            ];
        }
        // Scenario E: Neutral or Informational Updates
        else {
            sentiment = 'neutral';
            companySentiment = 'neutral';
            marketSentiment = hasMacroContext ? 'neutral' : 'neutral';
            whyItMatters = `Routine operational updates maintain steady-state visibility into ${companies}'s business trajectory.`;
            bottomLine = 'Continue tracking scheduled earnings reports and industry developments for directional catalysts.';
            shortTermOutlook = 'Muted directional impact anticipated in the absence of acute positive or negative surprises.';
            longTermConsiderations = `Evaluate long-term operational milestones during next formal reporting cycle.`;
            risks = ['Headline-driven noise without immediate fundamental support'];
            opportunities = ['Steady operational continuation without unexpected volatility'];
        }

        // Calculate separated confidence dimensions
        const hasCatalyst = hasCorporatePositive || hasCorporateNegative;
        const isMixed = sentiment === 'mixed';
        const interpEval = ConfidenceDimensionService.evaluateInterpretationConfidence(headline, summaryText, hasCatalyst, isMixed);
        const dirUncertainty = ConfidenceDimensionService.evaluateMarketDirectionalUncertainty(sentiment, hasMacroContext, isMixed);

        const confidenceDimensions: NewsConfidenceDimensions = {
            sourceReliabilityScore: sourceRel.score,
            sourceReliabilityTier: sourceRel.tier,
            sourceReliabilityRationale: sourceRel.rationale,
            interpretationConfidenceScore: interpEval.score,
            interpretationRationale: interpEval.rationale,
            marketDirectionalUncertaintyScore: dirUncertainty.score,
            directionalUncertaintyLevel: dirUncertainty.level,
            directionalUncertaintyRationale: dirUncertainty.rationale,
            calibrationDisclaimer: ConfidenceDimensionService.CALIBRATION_DISCLAIMER,
        };

        const impactMap: Record<NewsSentimentClass, 'positive' | 'negative' | 'mixed' | 'uncertain'> = {
            bullish: 'positive',
            bearish: 'negative',
            mixed: 'mixed',
            neutral: 'uncertain',
        };

        return {
            whatHappened,
            whyItMatters,
            bottomLine,
            impact: impactMap[sentiment],
            sentiment,
            confidenceScore: interpEval.score,
            confidenceRationale: interpEval.rationale,
            confidenceDimensions,
            sourceReliabilityScore: sourceRel.score,
            interpretationConfidenceScore: interpEval.score,
            marketDirectionalUncertaintyScore: dirUncertainty.score,
            directionalUncertaintyLevel: dirUncertainty.level,
            companySentiment,
            marketSentiment,
            shortTermOutlook,
            longTermConsiderations,
            affectedEntity: {
                name: companies,
                type: 'company',
                symbol: primarySymbol || undefined,
            },
            risks,
            opportunities,
            isAIGenerated: false,
            isFallback: true,
            sourceEvidence,
        };
    }

    /**
     * Clears the in-memory cache (useful for testing or starting a new scheduled batch)
     */
    public static clearCache(): void {
        summaryCache.clear();
    }
}
