import { getMarketService } from '@/services/market';
import { getNewsService } from '@/services/news';
import { getPortfolioService } from '@/services/portfolio';
import { getPersonalizationService } from '@/services/personalization';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { UserPreferenceModel } from '@/database/models/user_preference.model';
import { clerkClient } from '@clerk/nextjs/server';
import { StockQuote, CompanyProfile } from '@/types/market';
import { NewsArticleEntity } from '@/types/news';
import { PortfolioPosition, PortfolioSummary } from '@/types/portfolio';
import { UserPreferences } from '@/types/personalization';
import { EmailMarketContext, EmailNewsItem, EmailPortfolioContext } from '@/types/email';

export interface CollectedAlertContext {
    userId: string;
    userName: string;
    userEmail: string;
    symbol: string;
    companyProfile?: CompanyProfile;
    quote?: StockQuote;
    marketContext?: EmailMarketContext;
    relevantNews?: EmailNewsItem[];
    portfolioContext?: EmailPortfolioContext;
    portfolioPositions: PortfolioPosition[];
    portfolioSummary?: PortfolioSummary;
    watchlistSymbols: string[];
    userPreferences?: UserPreferences;
    isWatchlisted: boolean;
    isHeldInPortfolio: boolean;
}

export class AlertContextCollector {
    /**
     * Resolves user identity (email, name) securely using Clerk SDK and UserPreferenceModel fallback.
     */
    public static async resolveUserIdentity(userId: string): Promise<{ userName: string; userEmail: string }> {
        let userName = 'Investor';
        let userEmail = '';

        // 1. Try Clerk Server API
        try {
            const client = await clerkClient();
            const clerkUser = await client.users.getUser(userId);
            if (clerkUser) {
                userEmail = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '';
                userName = clerkUser.fullName || clerkUser.firstName || 'Investor';
            }
        } catch (clerkErr) {
            // Background or network fallback
        }

        // 2. Fallback to database user profile if Clerk lookup fails or email is empty
        if (!userEmail) {
            try {
                await connectToDatabase();
                const prefDoc = await UserPreferenceModel.findOne({ userId }).lean();
                if (prefDoc) {
                    if ((prefDoc as any).email) userEmail = (prefDoc as any).email;
                    if ((prefDoc as any).name) userName = (prefDoc as any).name;
                }
            } catch (dbErr) {
                console.warn('[AlertContextCollector] Failed to resolve user identity from DB:', dbErr);
            }
        }

        return { userName, userEmail };
    }

    /**
     * Collects full financial, portfolio, news, and benchmark context for an alert event.
     */
    public static async collectContext(userId: string, symbol: string): Promise<CollectedAlertContext> {
        const cleanSymbol = symbol.trim().toUpperCase();

        // 1. Resolve User Identity
        const { userName, userEmail } = await this.resolveUserIdentity(userId);

        // 2. Resolve User Portfolio & Watchlist
        let portfolioPositions: PortfolioPosition[] = [];
        let portfolioSummary: PortfolioSummary | undefined = undefined;
        let watchlistSymbols: string[] = [];
        let userPreferences: UserPreferences | undefined = undefined;

        try {
            await connectToDatabase();
            const [posRes, watchDocs, prefRes] = await Promise.all([
                getPortfolioService().getPositions(userId),
                Watchlist.find({ userId }).lean(),
                getPersonalizationService().getUserProfile(userId),
            ]);

            if (posRes.success && posRes.data) {
                portfolioPositions = posRes.data;
                const calcRes = await getPortfolioService().calculatePortfolioSummary(portfolioPositions);
                if (calcRes) portfolioSummary = calcRes;
            }

            if (watchDocs) {
                watchlistSymbols = watchDocs.map((w: any) => String(w.symbol).toUpperCase());
            }

            if (prefRes.success && prefRes.data) {
                userPreferences = prefRes.data;
            }
        } catch (err) {
            console.warn('[AlertContextCollector] Error collecting user data:', err);
        }

        const isWatchlisted = watchlistSymbols.includes(cleanSymbol);
        const heldPosition = portfolioPositions.find((p) => p.symbol.toUpperCase() === cleanSymbol);
        const isHeldInPortfolio = !!heldPosition;

        // 3. Resolve Market Data & Benchmarks
        const marketService = getMarketService();
        let quote: StockQuote | undefined;
        let companyProfile: CompanyProfile | undefined;
        let spyQuote: StockQuote | undefined;
        let qqqQuote: StockQuote | undefined;

        try {
            const [qRes, pRes, spyRes, qqqRes] = await Promise.all([
                marketService.getQuote(cleanSymbol),
                marketService.getCompanyProfile(cleanSymbol),
                marketService.getQuote('SPY'),
                marketService.getQuote('QQQ'),
            ]);

            if (qRes.success) quote = qRes.data;
            if (pRes.success) companyProfile = pRes.data;
            if (spyRes.success) spyQuote = spyRes.data;
            if (qqqRes.success) qqqQuote = qqqRes.data;
        } catch (err) {
            console.warn('[AlertContextCollector] Error fetching market quotes:', err);
        }

        // 4. Resolve News Headlines
        let relevantNews: EmailNewsItem[] = [];
        try {
            const newsService = getNewsService();
            const newsRes = await newsService.getCompanyNews(cleanSymbol);
            if (newsRes.success && newsRes.data) {
                relevantNews = newsRes.data.slice(0, 3).map((n: NewsArticleEntity) => ({
                    headline: n.headline,
                    source: n.source,
                    summary: n.summary,
                    url: n.url,
                    datetime: n.datetime,
                }));
            }
        } catch (err) {
            console.warn('[AlertContextCollector] Error fetching company news:', err);
        }

        // 5. Construct Email Market Context
        const marketContext: EmailMarketContext = {
            sp500Change: spyQuote?.percentChange,
            nasdaqChange: qqqQuote?.percentChange,
            sectorName: companyProfile?.industry,
            sectorPerformance: spyQuote?.percentChange,
        };

        // 6. Construct Portfolio Context
        let portfolioContext: EmailPortfolioContext | undefined;
        if (portfolioSummary && portfolioSummary.totalValue > 0) {
            const totalVal = portfolioSummary.totalValue;
            let positionWeight: number | undefined;
            if (heldPosition) {
                const posVal = heldPosition.shares * (quote?.currentPrice || heldPosition.costBasis);
                positionWeight = (posVal / totalVal) * 100;
            }

            portfolioContext = {
                totalValue: totalVal,
                dailyChange: portfolioSummary.dailyGainLoss,
                dailyPercent: portfolioSummary.dailyGainLossPercent,
                sharesHeld: heldPosition?.shares,
                positionWeight,
                concentrationRisk: positionWeight && positionWeight > 25
                    ? `Single-Holding Concentration (${positionWeight.toFixed(1)}%)`
                    : undefined,
                topContributor: portfolioSummary.topPerformer?.symbol,
                topDetractor: portfolioSummary.worstPerformer?.symbol,
            };
        }

        return {
            userId,
            userName,
            userEmail,
            symbol: cleanSymbol,
            companyProfile,
            quote,
            marketContext,
            relevantNews,
            portfolioContext,
            portfolioPositions,
            portfolioSummary,
            watchlistSymbols,
            userPreferences,
            isWatchlisted,
            isHeldInPortfolio,
        };
    }
}
