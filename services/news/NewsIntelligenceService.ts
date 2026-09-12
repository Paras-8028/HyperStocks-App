import {
    AINewsMarketSummary,
    AnalyzedNewsArticle,
    MarketTimelineEvent,
    NewsCluster,
    NewsIntelligenceOptions,
    NewsIntelligenceResponse,
    PersonalizedNewsItem,
    RawNewsArticle,
} from '@/types/news';
import { FinnhubNewsService } from './FinnhubNewsService';
import { NewsAnalyzerService } from './NewsAnalyzerService';
import { NewsClusteringService } from './NewsClusteringService';
import { getAIService } from '@/services/ai';
import { ApiResult } from '@/types/api';

export class NewsIntelligenceService {
    private newsService: FinnhubNewsService;

    constructor(newsService?: FinnhubNewsService) {
        this.newsService = newsService || new FinnhubNewsService();
    }

    /**
     * Synthesizes raw market news through deterministic analysis, clustering,
     * chronological timeline construction, personalized ranking, and AI interpretations.
     */
    public async getNewsIntelligence(
        options: NewsIntelligenceOptions = {}
    ): Promise<ApiResult<NewsIntelligenceResponse>> {
        try {
            const {
                watchlistSymbols = [],
                portfolioSymbols = [],
                preferredSectors = [],
                category = 'general',
            } = options;

            // 1. RAW NEWS INGESTION (Factual Data Source)
            const rawArticles = await this.fetchRawArticles(watchlistSymbols, portfolioSymbols, category);

            if (rawArticles.length === 0) {
                return {
                    success: false,
                    error: 'No news articles could be retrieved from market providers.',
                    code: 'NO_NEWS_DATA',
                };
            }

            // 2. NEWS ANALYSIS LAYER (Deterministic)
            const analyzedArticles: AnalyzedNewsArticle[] = rawArticles.map((art) =>
                NewsAnalyzerService.analyzeArticle(art)
            );

            // 3. STORY CLUSTERING & CHRONOLOGICAL TIMELINE
            const clusters: NewsCluster[] = NewsClusteringService.clusterArticles(analyzedArticles);
            const timeline = NewsClusteringService.buildMarketTimeline(clusters);

            // 4. PERSONALIZED RANKING & CAUSALITY EXPLANATIONS
            const personalizedFeed = this.rankAndExplainClusters(clusters, {
                watchlistSymbols,
                portfolioSymbols,
                preferredSectors,
            });

            // 5. AI MARKET NEWS SUMMARY (Gemini 3.6 Flash with deterministic fallback)
            const marketSummary = await this.generateMarketSummary(clusters, timeline);

            return {
                success: true,
                data: {
                    marketSummary,
                    timeline,
                    clusters,
                    personalizedFeed,
                    totalArticlesAnalyzed: analyzedArticles.length,
                    timestamp: Date.now(),
                },
            };
        } catch (err: any) {
            console.error('NewsIntelligenceService error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to synthesize news intelligence',
                code: 'NEWS_INTELLIGENCE_ERROR',
            };
        }
    }

    /**
     * Ingests real news from Finnhub across market and user-tracked symbols.
     */
    private async fetchRawArticles(
        watchlistSymbols: string[],
        portfolioSymbols: string[],
        category: string
    ): Promise<RawNewsArticle[]> {
        const targetSymbols = Array.from(
            new Set([...portfolioSymbols, ...watchlistSymbols, 'NVDA', 'AAPL', 'MSFT'])
        ).slice(0, 5);

        // Fetch general market news and company news in parallel
        const [marketRes, companyRes] = await Promise.all([
            this.newsService.getMarketNews(category),
            this.newsService.getCuratedWatchlistNews(targetSymbols),
        ]);

        const combined: RawNewsArticle[] = [];
        const seenHeadlines = new Set<string>();

        const addArticles = (articles: RawNewsArticle[] | undefined) => {
            if (!articles) return;
            for (const a of articles) {
                const norm = a.headline.trim().toLowerCase();
                if (!seenHeadlines.has(norm)) {
                    seenHeadlines.add(norm);
                    combined.push(a);
                }
            }
        };

        if (companyRes.success && companyRes.data) {
            addArticles(companyRes.data);
        }
        if (marketRes.success && marketRes.data) {
            addArticles(marketRes.data);
        }

        // Return sorted newest first
        return combined.sort((a, b) => b.datetime - a.datetime);
    }

    /**
     * Scores clusters based on the user's specific portfolio, watchlist, and sector preferences,
     * and produces clear, causality-driven explanations for why each news item matters.
     */
    private rankAndExplainClusters(
        clusters: NewsCluster[],
        context: {
            watchlistSymbols: string[];
            portfolioSymbols: string[];
            preferredSectors: string[];
        }
    ): PersonalizedNewsItem[] {
        const { watchlistSymbols, portfolioSymbols, preferredSectors } = context;

        const scoredItems: PersonalizedNewsItem[] = clusters.map((cluster) => {
            let score = 20; // base score
            const reasons: string[] = [];

            const clusterSymbols = cluster.affectedStocks.map((s) => s.symbol.toUpperCase());
            const clusterSectors = cluster.affectedSectors.map((s) => s.sector);

            // Check portfolio matches (Highest priority)
            const matchedPortfolio = portfolioSymbols.filter((sym) =>
                clusterSymbols.includes(sym.toUpperCase())
            );
            if (matchedPortfolio.length > 0) {
                score += 35;
                reasons.push(
                    `Directly affects your portfolio holding${
                        matchedPortfolio.length > 1 ? 's' : ''
                    } (${matchedPortfolio.join(', ')})`
                );
            }

            // Check watchlist matches
            const matchedWatchlist = watchlistSymbols.filter((sym) =>
                clusterSymbols.includes(sym.toUpperCase())
            );
            if (matchedWatchlist.length > 0) {
                score += 25;
                reasons.push(
                    `Involves stock${matchedWatchlist.length > 1 ? 's' : ''} on your active watchlist (${matchedWatchlist.join(
                        ', '
                    )})`
                );
            }

            // Check sector matches
            const matchedSectors = preferredSectors.filter((sec) =>
                clusterSectors.some((cs) => cs.toLowerCase() === sec.toLowerCase())
            );
            if (matchedSectors.length > 0) {
                score += 15;
                reasons.push(
                    `Aligns with your preferred sector focus (${matchedSectors.join(', ')})`
                );
            }

            // Multi-article coverage boost
            if (cluster.articles.length > 1) {
                score += 10;
                reasons.push(`High media volume (${cluster.articles.length} verified publications)`);
            }

            // High impact or strong sentiment boost
            if (cluster.dominantSentiment !== 'neutral') {
                score += 8;
            }

            // Recency boost (< 12 hours)
            const ageHours = (Date.now() - cluster.lastUpdated) / (1000 * 60 * 60);
            if (ageHours < 12) {
                score += 7;
            }

            const finalScore = Math.min(100, Math.max(15, Math.round(score)));

            // Construct causality "Why this matters to you" explanation
            const personalExplanation = this.buildCausalityExplanation(
                cluster,
                matchedPortfolio,
                matchedWatchlist,
                matchedSectors
            );

            return {
                cluster,
                relevanceScore: finalScore,
                personalExplanation,
                userRelevanceReasons: reasons,
            };
        });

        // Sort descending by relevance score
        return scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    private buildCausalityExplanation(
        cluster: NewsCluster,
        portfolioMatches: string[],
        watchlistMatches: string[],
        sectorMatches: string[]
    ): string {
        const sentimentWord =
            cluster.dominantSentiment === 'positive'
                ? 'favorable momentum'
                : cluster.dominantSentiment === 'negative'
                ? 'downside volatility risk'
                : 'market attention';

        if (portfolioMatches.length > 0 && watchlistMatches.length > 0) {
            return `This news matters to you because ${portfolioMatches.join(
                ', '
            )} is in your portfolio holdings and ${watchlistMatches.join(
                ', '
            )} is on your watchlist, creating direct ${sentimentWord} across your tracked capital.`;
        }

        if (portfolioMatches.length > 0) {
            return `This event directly impacts your portfolio position in ${portfolioMatches.join(
                ', '
            )}. Monitor position weighting and price action to determine whether to take profit or adjust stop buffers.`;
        }

        if (watchlistMatches.length > 0) {
            const sec = cluster.affectedSectors[0]?.sector;
            const secPhrase = sec ? ` and ${sec} sector developments` : '';
            return `This news matters to you because ${watchlistMatches.join(
                ', '
            )} is in your watchlist${secPhrase}, potentially creating a catalyst or favorable entry/exit zone.`;
        }

        if (sectorMatches.length > 0) {
            return `This development impacts the ${sectorMatches.join(
                ', '
            )} sector, which is one of your declared investment focus areas.`;
        }

        const primarySym = cluster.affectedStocks[0]?.symbol;
        if (primarySym) {
            return `Major headline movement surrounding ${primarySym} with broad sector implications for broader market breadth.`;
        }

        return `Macroeconomic development with multi-asset implications across equity and rates markets today.`;
    }

    /**
     * Generates an executive AI summary of today's market news.
     */
    private async generateMarketSummary(
        clusters: NewsCluster[],
        _timeline: MarketTimelineEvent[]
    ): Promise<AINewsMarketSummary> {
        const topClusters = clusters.slice(0, 5);
        const headlinesList = topClusters
            .map(
                (c, idx) =>
                    `${idx + 1}. [${c.dominantSentiment.toUpperCase()}] ${c.primaryHeadline} (Sectors: ${
                        c.affectedSectors.map((s) => s.sector).join(', ') || 'Macro'
                    })`
            )
            .join('\n');

        const prompt = `You are the lead financial market intelligence analyst at HyperStocks.
Synthesize the following verified market news events into an institutional-grade executive summary:

NEWS EVENTS:
${headlinesList}

Return a valid JSON object with the exact structure:
{
  "headline": "A punchy, informative 8-12 word market narrative headline summarizing today's key flow",
  "marketNarrative": "A concise 2-3 sentence executive synthesis explaining what is driving the market and why.",
  "keyCatalysts": ["Key catalyst 1", "Key catalyst 2", "Key catalyst 3"],
  "topRisks": ["Primary risk 1", "Primary risk 2"],
  "topOpportunities": ["Opportunity 1", "Opportunity 2"]
}

Rules:
- Be factual, professional, and concise.
- Ground all points strictly in the provided headlines.
- Return ONLY pure JSON with no markdown wrapping or preamble.`;

        try {
            const aiService = getAIService();
            const res = await aiService.generateCompletion(prompt);

            if (res.success && res.data) {
                const cleaned = res.data.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleaned);
                if (parsed.headline && parsed.marketNarrative) {
                    return {
                        headline: parsed.headline,
                        marketNarrative: parsed.marketNarrative,
                        keyCatalysts: parsed.keyCatalysts || [],
                        topRisks: parsed.topRisks || [],
                        topOpportunities: parsed.topOpportunities || [],
                        timestamp: Date.now(),
                    };
                }
            }
        } catch (err) {
            console.warn('NewsIntelligenceService: AI summary fallback', err);
        }

        // Deterministic Fallback
        const primaryCluster = topClusters[0];
        const isBullish = topClusters.filter((c) => c.dominantSentiment === 'positive').length > topClusters.filter((c) => c.dominantSentiment === 'negative').length;

        return {
            headline: primaryCluster
                ? primaryCluster.primaryHeadline
                : 'Market Catalysts & Corporate Earnings Drive Selective Volatility',
            marketNarrative: `Financial markets are processing updates across ${
                primaryCluster?.topic || 'core equity sectors'
            }, with ${isBullish ? 'resilient upside momentum' : 'cautious consolidation'} as institutional capital rotates into high-conviction opportunities.`,
            keyCatalysts: topClusters.map((c) => c.primaryHeadline).slice(0, 3),
            topRisks: [
                'Headline-driven volatility surrounding regulatory inquiries and rate projections',
                'Sector divergence between megacap tech and defensive sectors',
            ],
            topOpportunities: [
                'Momentum continuation in leading infrastructure and semiconductor assets',
                'Mean-reversion entry points on quality equities pulling back to moving average support',
            ],
            timestamp: Date.now(),
        };
    }
}
