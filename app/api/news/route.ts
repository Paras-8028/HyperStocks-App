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

        // 2. Standard Ticker News
        if (symbolsParam) {
            const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);
            const res = await newsService.getCuratedWatchlistNews(symbols);
            return NextResponse.json(res);
        }

        // 3. General Raw Market News
        const res = await newsService.getMarketNews(category);
        return NextResponse.json(res);
    } catch (err: any) {
        console.error('GET /api/news error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to fetch news' },
            { status: 500 }
        );
    }
}
