import { FinnhubNewsService } from './FinnhubNewsService';
import { getDateRange, validateArticle } from '@/lib/utils';
import { ApiClient } from '@/services/api/apiClient';
import { NewsSentimentClass, NewsConfidenceDimensions } from '@/types/news';

export interface WatchlistStockItem {
    symbol: string;
    company: string;
}

export interface WatchlistArticle {
    id: string;
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number;
    relatedSymbols: string[];
    relatedCompanies: string[];
    relevanceScore: number;
    // Structured summaries for the email cards and news feed
    whatHappened?: string;
    whyItMatters?: string;
    bottomLine?: string;
    impact?: 'positive' | 'negative' | 'mixed' | 'uncertain';
    sentiment?: NewsSentimentClass;
    confidenceScore?: number;
    confidenceRationale?: string;
    confidenceDimensions?: NewsConfidenceDimensions;
    sourceReliabilityScore?: number;
    interpretationConfidenceScore?: number;
    marketDirectionalUncertaintyScore?: number;
    directionalUncertaintyLevel?: 'low' | 'moderate' | 'high' | 'extreme';
    companySentiment?: NewsSentimentClass;
    marketSentiment?: NewsSentimentClass;
    shortTermOutlook?: string;
    longTermConsiderations?: string;
    affectedEntity?: {
        name: string;
        type: 'company' | 'sector' | 'market';
        symbol?: string;
    };
    risks?: string[];
    opportunities?: string[];
    isAIGenerated?: boolean;
    isFallback?: boolean;
    sourceEvidence?: {
        headline: string;
        source: string;
        url: string;
        datetime: number;
    };
}

export interface WatchlistNewsResult {
    status: 'success' | 'no_news' | 'empty_watchlist' | 'api_error';
    articles: WatchlistArticle[];
    allTrackedSymbols: string[];
    allTrackedCompanies: Record<string, string>;
    symbolsWithNews: string[];
    symbolsWithoutNews: string[];
    error?: string;
}

// Common English words or short generic tokens that are also stock tickers.
// These require strict context (e.g. $TICKER, (TICKER), or company name presence)
// to prevent matching unrelated sentences.
const AMBIGUOUS_TICKERS = new Set([
    'A', 'I', 'IN', 'ON', 'IT', 'AT', 'TO', 'BY', 'OR', 'AN', 'AS', 'BE', 'DO', 'GO',
    'HE', 'IF', 'IS', 'ME', 'MY', 'NO', 'SO', 'UP', 'US', 'WE', 'ALL', 'CAN', 'FOR',
    'NOW', 'OUT', 'SEE', 'ARE', 'ONE', 'BIG', 'HAS', 'HAD', 'HIM', 'HIS', 'HOW', 'MAN',
    'NEW', 'NOT', 'OLD', 'OUR', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'ITS', 'LET', 'PUT',
    'SAY', 'SHE', 'TOO', 'USE', 'DAY', 'GET', 'CAR', 'CAT', 'DOG', 'KEY', 'TOP', 'MAX',
    'NEXT', 'BEST', 'GOOD', 'REAL', 'TRUE', 'FAST', 'OPEN', 'POST', 'TECH', 'PLUS', 'SAVE',
    'PLAY', 'LOVE', 'SAFE', 'LIFE', 'FREE', 'CARE', 'HOPE', 'GOLD', 'RATE', 'PLAN', 'MOVE',
    'SPOT', 'WELL', 'WILL', 'JUST', 'KNOW', 'TAKE', 'TIME', 'YEAR', 'SOME', 'THEM', 'THEN'
]);

// Exclude patterns for sports, unrelated politics, celebrity gossip
const IRRELEVANT_PATTERNS = [
    /\bgolf\b/i,
    /\btournament\b/i,
    /\bchampionship\b/i,
    /\bleague\b/i,
    /\bpremier league\b/i,
    /\bnba\b/i,
    /\bnfl\b/i,
    /\bworld cup\b/i,
    /\bgubernatorial campaign\b/i,
    /\belection rally\b/i,
    /\bcelebrity\b/i,
    /\bhollywood\b/i,
    /\bred carpet\b/i,
    /\bhoroscope\b/i,
];

// Major corporate catalysts to score significance
const CATALYST_PATTERNS = [
    { pattern: /\b(earnings|quarterly|revenue|profit|eps|guidance|q[1-4]|ebitda)\b/i, weight: 6 },
    { pattern: /\b(acquisition|acquired|merger|buyout|takeover|partnership|deal|contract)\b/i, weight: 5 },
    { pattern: /\b(sec|investigation|lawsuit|settlement|subpoena|antitrust|doj|patent|law|fine)\b/i, weight: 5 },
    { pattern: /\b(fda|approval|trial|phase [1-3]|drug|clearance)\b/i, weight: 5 },
    { pattern: /\b(unveils|launches|product|chip|model|ai|breakthrough|release)\b/i, weight: 4 },
    { pattern: /\b(ceo|cfo|executive|resigns|appoints|board of directors|fired|steps down)\b/i, weight: 4 },
    { pattern: /\b(upgrade|downgrade|price target|outperform|underperform|rating|analyst)\b/i, weight: 3 },
    { pattern: /\b(dividend|split|buyback|shares repurchase)\b/i, weight: 3 },
];

export class WatchlistNewsService {
    private readonly baseUrl = 'https://finnhub.io/api/v1';
    private readonly token: string;

    constructor(token?: string) {
        this.token =
            token ||
            process.env.FINNHUB_API_KEY ||
            process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
            '';
    }

    /**
     * Normalizes headlines by removing wire noise, prefixes (BRIEF, UPDATE, etc.) and punctuation
     * to avoid treating multiple syndicated articles repeating the same announcement as independent evidence.
     */
    public static normalizeHeadlineForDeduplication(headline: string): string {
        return (headline || '')
            .toLowerCase()
            .replace(/^(brief\s*[-:]|update\s*\d*\s*[-:]|exclusive\s*[-:]|breaking\s*[-:]|press release\s*[-:]|stocks to watch\s*[-:])/i, '')
            .replace(/[^a-z0-9 ]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Cleans company name by removing corporate legal suffixes
     * e.g. "Apple Inc." -> "Apple", "NVIDIA Corporation" -> "NVIDIA", "Tesla, Inc." -> "Tesla"
     */
    public normalizeCompanyName(company: string): string {
        if (!company) return '';
        return company
            .replace(/,\s*(Inc\.|Ltd\.|LLC|Corp\.|Corporation|plc|S\.A\.|Holdings|Co\.|Group|N\.V\.)/gi, '')
            .replace(/\s+(Inc\.|Ltd\.|LLC|Corp\.|Corporation|plc|Holdings|Co\.|Group)/gi, '')
            .trim();
    }

    /**
     * Tests if text mentions a symbol or company in a genuinely relevant financial context
     */
    public isRelevantToStock(
        text: string,
        symbol: string,
        company: string
    ): boolean {
        if (!text || (!symbol && !company)) return false;

        const cleanSymbol = symbol.trim().toUpperCase();
        const normCompany = this.normalizeCompanyName(company);

        // 1. Check normalized company name (case-insensitive word boundary)
        if (normCompany && normCompany.length > 2) {
            const escapedCompany = normCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const companyRegex = new RegExp(`\\b${escapedCompany}\\b`, 'i');
            if (companyRegex.test(text)) {
                return true;
            }
        }

        // 2. Ticker checks
        if (cleanSymbol) {
            // Ticker with $ prefix ($AAPL, $NVDA) is always a strong financial match
            const cashTagRegex = new RegExp(`\\$${cleanSymbol}\\b`, 'i');
            if (cashTagRegex.test(text)) {
                return true;
            }

            // Ticker in parentheses or exchange prefix: (AAPL), (NASDAQ:AAPL), NYSE:AAPL
            const parenRegex = new RegExp(`\\((?:[A-Z]+:)?${cleanSymbol}\\)`, 'i');
            if (parenRegex.test(text)) {
                return true;
            }

            // Ticker followed by stock/shares/ticker/equity
            const contextRegex = new RegExp(`\\b${cleanSymbol}\\s+(?:stock|shares|equity|earnings|reports|revenue|options|q[1-4])\\b`, 'i');
            if (contextRegex.test(text)) {
                return true;
            }

            // If ticker is NOT in ambiguous word list, match standard uppercase standalone ticker
            if (!AMBIGUOUS_TICKERS.has(cleanSymbol)) {
                const plainTickerRegex = new RegExp(`\\b${cleanSymbol}\\b`);
                if (plainTickerRegex.test(text)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Fetches Finnhub company news for a list of distinct tickers with bounded concurrency
     * and rate-limiting protection.
     */
    async fetchNewsForDistinctTickers(
        tickers: string[],
        daysBack = 4,
        concurrency = 4
    ): Promise<{ newsMap: Map<string, any[]>; hadSuccessfulFetch: boolean; error?: string }> {
        const newsMap = new Map<string, any[]>();
        if (!tickers || tickers.length === 0) {
            return { newsMap, hadSuccessfulFetch: true };
        }

        if (!this.token) {
            return { newsMap, hadSuccessfulFetch: false, error: 'Finnhub API key is not configured' };
        }

        const range = getDateRange(daysBack);
        let hadSuccessfulFetch = false;
        let lastError: string | undefined;

        // Process tickers in bounded concurrent chunks
        for (let i = 0; i < tickers.length; i += concurrency) {
            const chunk = tickers.slice(i, i + concurrency);
            await Promise.all(
                chunk.map(async (sym) => {
                    const cleanSym = sym.trim().toUpperCase();
                    try {
                        const url = `${this.baseUrl}/company-news?symbol=${encodeURIComponent(cleanSym)}&from=${range.from}&to=${range.to}&token=${this.token}`;
                        const res = await ApiClient.get<any[]>(url, { revalidateSeconds: 300 });

                        if (!res.success) {
                            lastError = res.error;
                            newsMap.set(cleanSym, []);
                            return;
                        }

                        hadSuccessfulFetch = true;
                        newsMap.set(cleanSym, res.data || []);
                    } catch (err: any) {
                        lastError = err?.message || 'Error fetching ticker news';
                        newsMap.set(cleanSym, []);
                    }
                })
            );

            // Brief throttle pause between chunks to respect API rate limits
            if (i + concurrency < tickers.length) {
                await new Promise((resolve) => setTimeout(resolve, 120));
            }
        }

        return { newsMap, hadSuccessfulFetch, error: lastError };
    }

    /**
     * Filters, deduplicates, scores, and ranks news articles for a specific user watchlist
     * using pre-fetched or cached raw news data. Guarantees user isolation.
     */
    filterAndRankNewsForWatchlist(
        watchlist: WatchlistStockItem[],
        newsMap: Map<string, any[]>,
        maxArticles = 6,
        apiError?: string
    ): WatchlistNewsResult {
        if (!watchlist || watchlist.length === 0) {
            return {
                status: 'empty_watchlist',
                articles: [],
                allTrackedSymbols: [],
                allTrackedCompanies: {},
                symbolsWithNews: [],
                symbolsWithoutNews: [],
            };
        }

        const allTrackedSymbols: string[] = [];
        const allTrackedCompanies: Record<string, string> = {};

        watchlist.forEach((item) => {
            const sym = item.symbol.trim().toUpperCase();
            if (sym && !allTrackedSymbols.includes(sym)) {
                allTrackedSymbols.push(sym);
                allTrackedCompanies[sym] = item.company || sym;
            }
        });

        if (allTrackedSymbols.length === 0) {
            return {
                status: 'empty_watchlist',
                articles: [],
                allTrackedSymbols: [],
                allTrackedCompanies: {},
                symbolsWithNews: [],
                symbolsWithoutNews: [],
            };
        }

        const candidateArticles: Map<string, { raw: any; symbols: Set<string> }> = new Map();
        let hadAnyArticles = false;

        for (const sym of allTrackedSymbols) {
            const items = newsMap.get(sym) || [];
            const companyName = allTrackedCompanies[sym] || sym;

            for (const art of items) {
                if (!validateArticle(art)) continue;
                hadAnyArticles = true;

                const fullText = `${art.headline || ''} ${art.summary || ''}`;

                // Filter out non-market noise
                const isNoisy = IRRELEVANT_PATTERNS.some((pat) => pat.test(art.headline || ''));
                if (isNoisy) continue;

                // Context and relevance verification
                if (!this.isRelevantToStock(fullText, sym, companyName)) {
                    continue;
                }

                // Canonical URL or normalized headline deduplication
                const urlKey = (art.url && art.url !== '#')
                    ? art.url.split('?')[0].toLowerCase()
                    : '';
                const normHeadline = WatchlistNewsService.normalizeHeadlineForDeduplication(art.headline || '');

                if (!normHeadline && !urlKey) continue;

                // Match against existing candidate entries by URL or normalized headline
                let matchedKey: string | null = null;
                if (urlKey && candidateArticles.has(urlKey)) {
                    matchedKey = urlKey;
                } else if (normHeadline && candidateArticles.has(normHeadline)) {
                    matchedKey = normHeadline;
                } else {
                    for (const [existingKey, entry] of candidateArticles.entries()) {
                        const existingNorm = WatchlistNewsService.normalizeHeadlineForDeduplication(entry.raw.headline || '');
                        if (existingNorm && normHeadline && existingNorm === normHeadline) {
                            matchedKey = existingKey;
                            break;
                        }
                    }
                }

                if (matchedKey) {
                    candidateArticles.get(matchedKey)!.symbols.add(sym);
                } else {
                    const primaryKey = urlKey || normHeadline;
                    candidateArticles.set(primaryKey, {
                        raw: art,
                        symbols: new Set([sym]),
                    });
                }
            }
        }

        if (candidateArticles.size === 0) {
            if (apiError && !hadAnyArticles) {
                return {
                    status: 'api_error',
                    articles: [],
                    allTrackedSymbols,
                    allTrackedCompanies,
                    symbolsWithNews: [],
                    symbolsWithoutNews: allTrackedSymbols,
                    error: apiError,
                };
            }

            return {
                status: 'no_news',
                articles: [],
                allTrackedSymbols,
                allTrackedCompanies,
                symbolsWithNews: [],
                symbolsWithoutNews: allTrackedSymbols,
            };
        }

        // Score and rank articles
        const scoredArticles: WatchlistArticle[] = [];
        const nowMs = Date.now();

        for (const [key, { raw, symbols }] of candidateArticles.entries()) {
            const symList = Array.from(symbols);
            const compList = symList.map((s) => allTrackedCompanies[s] || s);

            const headline = raw.headline || '';
            const summary = raw.summary || '';
            const datetimeMs = (raw.datetime || 0) * 1000 || nowMs;

            let score = 10;

            // Headline relevance bonus
            for (const sym of symList) {
                const comp = allTrackedCompanies[sym] || '';
                if (this.isRelevantToStock(headline, sym, comp)) {
                    score += 6;
                }
            }

            // Multi-stock relevance bonus
            if (symList.length > 1) {
                score += 5;
            }

            // Catalyst scoring
            for (const { pattern, weight } of CATALYST_PATTERNS) {
                if (pattern.test(headline)) score += weight * 1.5;
                else if (pattern.test(summary)) score += weight;
            }

            // Recency boost (within 24h: +4, 48h: +2)
            const hoursOld = (nowMs - datetimeMs) / (1000 * 60 * 60);
            if (hoursOld < 24) score += 4;
            else if (hoursOld < 48) score += 2;

            scoredArticles.push({
                id: String(raw.id || key),
                headline,
                summary,
                source: raw.source || 'Financial Wire',
                url: raw.url || '#',
                datetime: datetimeMs,
                relatedSymbols: symList,
                relatedCompanies: compList,
                relevanceScore: score,
            });
        }

        // Sort descending by score, then datetime
        scoredArticles.sort((a, b) => {
            if (b.relevanceScore !== a.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
            }
            return b.datetime - a.datetime;
        });

        const selectedArticles = scoredArticles.slice(0, maxArticles);

        // Coverage tracking
        const symbolsWithNewsSet = new Set<string>();
        selectedArticles.forEach((art) => {
            art.relatedSymbols.forEach((s) => symbolsWithNewsSet.add(s));
        });

        const symbolsWithNews = allTrackedSymbols.filter((s) => symbolsWithNewsSet.has(s));
        const symbolsWithoutNews = allTrackedSymbols.filter((s) => !symbolsWithNewsSet.has(s));

        return {
            status: 'success',
            articles: selectedArticles,
            allTrackedSymbols,
            allTrackedCompanies,
            symbolsWithNews,
            symbolsWithoutNews,
        };
    }

    /**
     * Fetches and ranks personalized news articles for a user's watchlist
     */
    async getPersonalizedWatchlistNews(
        watchlist: WatchlistStockItem[],
        daysBack = 4,
        maxArticles = 6
    ): Promise<WatchlistNewsResult> {
        if (!watchlist || watchlist.length === 0) {
            return {
                status: 'empty_watchlist',
                articles: [],
                allTrackedSymbols: [],
                allTrackedCompanies: {},
                symbolsWithNews: [],
                symbolsWithoutNews: [],
            };
        }

        const distinctSymbols = Array.from(new Set(watchlist.map((w) => w.symbol.trim().toUpperCase())));
        const { newsMap, error } = await this.fetchNewsForDistinctTickers(distinctSymbols, daysBack);

        return this.filterAndRankNewsForWatchlist(watchlist, newsMap, maxArticles, error);
    }
}
