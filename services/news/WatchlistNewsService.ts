import { FinnhubNewsService } from './FinnhubNewsService';
import { getDateRange, validateArticle } from '@/lib/utils';
import { ApiClient } from '@/services/api/apiClient';

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
    // Structured summaries for the email cards
    whatHappened?: string;
    whyItMatters?: string;
    bottomLine?: string;
    impact?: 'positive' | 'negative' | 'mixed' | 'uncertain';
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

        if (!this.token) {
            return {
                status: 'api_error',
                articles: [],
                allTrackedSymbols,
                allTrackedCompanies,
                symbolsWithNews: [],
                symbolsWithoutNews: allTrackedSymbols,
                error: 'Finnhub API key is not configured',
            };
        }

        const range = getDateRange(daysBack);
        const candidateArticles: Map<string, { raw: any; symbols: Set<string> }> = new Map();

        // 1. Fetch company news per tracked symbol
        let hadSuccessfulFetch = false;
        let lastError: string | undefined;

        await Promise.all(
            allTrackedSymbols.map(async (sym) => {
                const companyName = allTrackedCompanies[sym] || sym;
                try {
                    const url = `${this.baseUrl}/company-news?symbol=${encodeURIComponent(sym)}&from=${range.from}&to=${range.to}&token=${this.token}`;
                    const res = await ApiClient.get<any[]>(url, { revalidateSeconds: 300 });

                    if (!res.success) {
                        lastError = res.error;
                        return;
                    }

                    hadSuccessfulFetch = true;
                    const items = res.data || [];

                    for (const art of items) {
                        if (!validateArticle(art)) continue;

                        const fullText = `${art.headline || ''} ${art.summary || ''}`;

                        // Check for irrelevant non-market noise
                        const isNoisy = IRRELEVANT_PATTERNS.some((pat) => pat.test(art.headline || ''));
                        if (isNoisy) continue;

                        // Verify relevance to this symbol/company
                        if (!this.isRelevantToStock(fullText, sym, companyName)) {
                            continue;
                        }

                        // Deduplicate by URL or normalized headline
                        const dedupeKey = (art.url && art.url !== '#')
                            ? art.url.split('?')[0].toLowerCase()
                            : (art.headline || '').toLowerCase().trim();

                        if (!dedupeKey) continue;

                        if (candidateArticles.has(dedupeKey)) {
                            candidateArticles.get(dedupeKey)!.symbols.add(sym);
                        } else {
                            candidateArticles.set(dedupeKey, {
                                raw: art,
                                symbols: new Set([sym]),
                            });
                        }
                    }
                } catch (e: any) {
                    lastError = e?.message;
                }
            })
        );

        if (!hadSuccessfulFetch && candidateArticles.size === 0) {
            return {
                status: 'api_error',
                articles: [],
                allTrackedSymbols,
                allTrackedCompanies,
                symbolsWithNews: [],
                symbolsWithoutNews: allTrackedSymbols,
                error: lastError || 'Failed to communicate with news provider',
            };
        }

        // 2. Score and rank articles
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

            // Multi-stock relevance bonus (e.g. deals between two watched stocks)
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

        // 3. Track coverage across the user's watchlist
        const symbolsWithNewsSet = new Set<string>();
        selectedArticles.forEach((art) => {
            art.relatedSymbols.forEach((s) => symbolsWithNewsSet.add(s));
        });

        const symbolsWithNews = allTrackedSymbols.filter((s) => symbolsWithNewsSet.has(s));
        const symbolsWithoutNews = allTrackedSymbols.filter((s) => !symbolsWithNewsSet.has(s));

        if (selectedArticles.length === 0) {
            return {
                status: 'no_news',
                articles: [],
                allTrackedSymbols,
                allTrackedCompanies,
                symbolsWithNews: [],
                symbolsWithoutNews: allTrackedSymbols,
            };
        }

        return {
            status: 'success',
            articles: selectedArticles,
            allTrackedSymbols,
            allTrackedCompanies,
            symbolsWithNews,
            symbolsWithoutNews,
        };
    }
}
