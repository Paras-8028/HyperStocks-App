import { getMarketService } from '@/services/market';
import { getPortfolioService } from '@/services/portfolio';
import { getNewsService } from '@/services/news';
import { getPersonalizationService } from '@/services/personalization';
import { getWatchlistSymbolsByEmail } from '@/lib/actions/watchlist.actions';
import { StockQuote, FinancialMetrics } from '@/types/market';
import { PortfolioPosition, PortfolioSummary } from '@/types/portfolio';
import { NewsArticleEntity } from '@/types/news';
import { UserPreferences } from '@/types/personalization';

export interface ContextOptions {
    userId?: string;
    userEmail?: string;
    currentSymbol?: string;
    includePortfolio?: boolean;
    includeWatchlist?: boolean;
}

export interface ExtractedContext {
    mentionedSymbols: string[];
    quotes: Record<string, StockQuote>;
    metrics: Record<string, FinancialMetrics>;
    news: NewsArticleEntity[];
    portfolio?: {
        positions: PortfolioPosition[];
        summary: PortfolioSummary;
    };
    watchlistSymbols?: string[];
    userPreferences?: Partial<UserPreferences>;
}

// Known company name to ticker mapping for natural language queries
const COMPANY_TICKER_MAP: Record<string, string> = {
    apple: 'AAPL',
    microsoft: 'MSFT',
    nvidia: 'NVDA',
    tesla: 'TSLA',
    amazon: 'AMZN',
    google: 'GOOGL',
    alphabet: 'GOOGL',
    meta: 'META',
    facebook: 'META',
    broadcom: 'AVGO',
    amd: 'AMD',
    intel: 'INTC',
    qualcomm: 'QCOM',
    netflix: 'NFLX',
    jpmorgan: 'JPM',
    berkshire: 'BRK.B',
    exxon: 'XOM',
    chevron: 'CVX',
    eli: 'LLY',
    lilly: 'LLY',
    visa: 'V',
    mastercard: 'MA',
    walmart: 'WMT',
    costco: 'COST',
    uber: 'UBER',
};

export class AIContextBuilder {
    /**
     * Extracts tickers mentioned either as ticker symbol (AAPL) or company name (Apple).
     */
    static extractSymbols(query: string, currentSymbol?: string): string[] {
        const found = new Set<string>();
        const lower = query.toLowerCase();

        if (currentSymbol) {
            found.add(currentSymbol.toUpperCase());
        }

        // Check common company names
        for (const [name, ticker] of Object.entries(COMPANY_TICKER_MAP)) {
            const regex = new RegExp(`\\b${name}\\b`, 'i');
            if (regex.test(lower)) {
                found.add(ticker);
            }
        }

        // Check uppercase ticker patterns (e.g. $AAPL or standalone AAPL, 2-5 capital letters)
        const tickerRegex = /\$?([A-Z]{1,5})\b/g;
        let match;
        const ignoreWords = new Set([
            'AI', 'US', 'THE', 'AND', 'FOR', 'WHAT', 'WHY', 'HOW', 'TODAY', 'ARE', 'CAN', 'YOU', 'BUY', 'SELL', 'P/E', 'EPS', 'VIX', 'ETF', 'CEO', 'CFO', 'SEC', 'IPO', 'USD'
        ]);

        while ((match = tickerRegex.exec(query)) !== null) {
            const sym = match[1].toUpperCase();
            if (!ignoreWords.has(sym) && sym.length >= 2) {
                found.add(sym);
            }
        }

        return Array.from(found).slice(0, 4); // Limit to top 4 relevant symbols
    }

    /**
     * Dynamically builds relevant financial context grounded in live market and portfolio data.
     */
    static async buildContext(
        query: string,
        options: ContextOptions = {}
    ): Promise<{ contextData: ExtractedContext; formattedContextString: string }> {
        const marketService = getMarketService();
        const newsService = getNewsService();
        const portfolioService = getPortfolioService();
        const personalizationService = getPersonalizationService();

        const lower = query.toLowerCase();
        const symbols = this.extractSymbols(query, options.currentSymbol);

        const quotes: Record<string, StockQuote> = {};
        const metrics: Record<string, FinancialMetrics> = {};
        let newsArticles: NewsArticleEntity[] = [];
        let portfolioData: ExtractedContext['portfolio'] = undefined;
        let watchlistSymbols: string[] = [];
        let userPreferences: Partial<UserPreferences> | undefined = undefined;

        // 1. Fetch data for identified tickers
        await Promise.all(
            symbols.map(async (sym) => {
                const [qRes, mRes] = await Promise.all([
                    marketService.getQuote(sym),
                    marketService.getFinancialMetrics(sym),
                ]);
                if (qRes.success) quotes[sym] = qRes.data;
                if (mRes.success) metrics[sym] = mRes.data;
            })
        );

        // 2. Fetch news if query asks about "news", "why", "happened", or specific ticker
        const isNewsQuery =
            lower.includes('news') ||
            lower.includes('why') ||
            lower.includes('happened') ||
            lower.includes('down') ||
            lower.includes('up') ||
            lower.includes('moving');

        if (isNewsQuery) {
            if (symbols.length > 0) {
                const newsRes = await newsService.getCompanyNews(symbols[0], 5);
                if (newsRes.success) newsArticles = newsRes.data.slice(0, 4);
            } else {
                const marketNewsRes = await newsService.getMarketNews('general');
                if (marketNewsRes.success) newsArticles = marketNewsRes.data.slice(0, 4);
            }
        }

        // 3. Fetch portfolio if query touches portfolio or holdings
        const isPortfolioQuery =
            lower.includes('portfolio') ||
            lower.includes('holding') ||
            lower.includes('my risk') ||
            options.includePortfolio;

        if (isPortfolioQuery && options.userId) {
            const posRes = await portfolioService.getPositions(options.userId);
            if (posRes.success) {
                const sum = await portfolioService.calculatePortfolioSummary(posRes.data);
                portfolioData = {
                    positions: posRes.data,
                    summary: sum,
                };
            }
        }

        // 4. Fetch watchlist if query mentions watchlist
        const isWatchlistQuery =
            lower.includes('watchlist') ||
            lower.includes('watching') ||
            options.includeWatchlist;

        if (isWatchlistQuery && options.userEmail) {
            watchlistSymbols = await getWatchlistSymbolsByEmail(options.userEmail);
        }

        // 5. Fetch user preferences if available
        if (options.userEmail) {
            const prefRes = await personalizationService.getUserProfile(options.userEmail);
            if (prefRes.success) {
                userPreferences = prefRes.data;
            }
        }

        // 6. Format into high-density prompt text
        const sections: string[] = [];

        if (Object.keys(quotes).length > 0) {
            const quoteLines = Object.values(quotes).map((q) => {
                const m = metrics[q.symbol];
                return `- ${q.symbol}: $${q.currentPrice.toFixed(2)} (${q.percentChange >= 0 ? '+' : ''}${q.percentChange.toFixed(2)}%, High: $${q.highPrice?.toFixed(2) ?? 'N/A'}, Low: $${q.lowPrice?.toFixed(2) ?? 'N/A'})${
                    m?.peRatio ? ` | P/E: ${m.peRatio.toFixed(1)}` : ''
                }${m?.fiftyTwoWeekHigh ? ` | 52W High: $${m.fiftyTwoWeekHigh.toFixed(1)}` : ''}`;
            });
            sections.push(`LIVE MARKET DATA:\n${quoteLines.join('\n')}`);
        }

        if (newsArticles.length > 0) {
            const newsLines = newsArticles.map(
                (a) => `- [${a.source}] ${a.headline}: ${a.summary.slice(0, 140)}...`
            );
            sections.push(`RELEVANT RECENT NEWS:\n${newsLines.join('\n')}`);
        }

        if (portfolioData && portfolioData.positions.length > 0) {
            const posLines = portfolioData.positions.map(
                (p) =>
                    `- ${p.symbol}: ${p.shares} shares @ cost $${p.costBasis.toFixed(2)} (Value: $${p.marketValue?.toFixed(2) ?? '0'}, P&L: ${p.unrealizedGainLossPercent?.toFixed(1) ?? '0'}%)`
            );
            sections.push(
                `USER PORTFOLIO SUMMARY:\nTotal Value: $${portfolioData.summary.totalValue.toFixed(2)} | Net P&L: ${portfolioData.summary.totalGainLossPercent.toFixed(2)}%\nHoldings:\n${posLines.join('\n')}`
            );
        }

        if (watchlistSymbols.length > 0) {
            sections.push(`USER WATCHLIST: ${watchlistSymbols.join(', ')}`);
        }

        if (userPreferences) {
            const sectors = userPreferences.preferredSectors?.join(', ') || userPreferences.preferredIndustry || 'Technology';
            const goals = Array.isArray(userPreferences.investmentGoals)
                ? userPreferences.investmentGoals.join(', ')
                : userPreferences.investmentGoals;
            sections.push(
                `USER INVESTOR PERSONA & PERSONALIZATION:
- Experience Level: ${userPreferences.experienceLevel || 'intermediate'} (Tailor explanation depth and vocabulary accordingly)
- Risk Tolerance: ${userPreferences.riskTolerance || 'moderate'} (If conservative, emphasize downside risk; if aggressive, emphasize upside drivers)
- Primary Goals: ${goals || 'Growth'}
- Preferred Sectors: ${sectors}
- Investment Horizon: ${userPreferences.investmentHorizon || 'medium_term'}
- Preferred Analysis Style: ${userPreferences.preferredAnalysisStyle || 'balanced'} (Focus explanations on ${userPreferences.preferredAnalysisStyle || 'balanced'} metrics)`
            );
        }

        const formattedContextString = sections.join('\n\n');

        return {
            contextData: {
                mentionedSymbols: symbols,
                quotes,
                metrics,
                news: newsArticles,
                portfolio: portfolioData,
                watchlistSymbols,
                userPreferences,
            },
            formattedContextString,
        };
    }
}
