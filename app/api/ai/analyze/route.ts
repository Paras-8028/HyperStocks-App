import { NextResponse } from 'next/server';
import { getAIService } from '@/services/ai';
import { getMarketService } from '@/services/market';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { getPersonalizationService } from '@/services/personalization';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type = 'stock_thesis', symbol, context, positions, watchlistSymbols, userPreferences } = body;
        const aiService = getAIService();
        const marketService = getMarketService();

        // 1. Stock Thesis
        if (type === 'stock_thesis') {
            if (!symbol) {
                return NextResponse.json(
                    { success: false, error: 'Symbol parameter is required' },
                    { status: 400 }
                );
            }

            // Fetch live quote and metrics if not supplied
            let quote = context?.quote;
            let metrics = context?.metrics;
            let profile = context?.profile;

            if (!quote) {
                const quoteRes = await marketService.getQuote(symbol);
                if (quoteRes.success) quote = quoteRes.data;
            }

            if (!metrics) {
                const metricsRes = await marketService.getFinancialMetrics(symbol);
                if (metricsRes.success) metrics = metricsRes.data;
            }

            if (!profile) {
                const profRes = await marketService.getCompanyProfile(symbol);
                if (profRes.success) profile = profRes.data;
            }

            const thesisResult = await aiService.generateStockThesis(symbol, {
                currentSymbol: symbol,
                quote,
                metrics,
                profile,
            });

            return NextResponse.json(thesisResult);
        }

        // 2. Portfolio Risk Audit
        if (type === 'portfolio_audit') {
            const auditResult = await aiService.auditPortfolioRisk(
                positions || [],
                userPreferences
            );
            return NextResponse.json(auditResult);
        }

        // 3. Personalized Market Briefing
        if (type === 'market_briefing') {
            const briefingResult = await aiService.generateMarketBriefing(
                watchlistSymbols || [],
                userPreferences
            );
            return NextResponse.json(briefingResult);
        }

        return NextResponse.json(
            { success: false, error: `Unsupported analysis type: ${type}` },
            { status: 400 }
        );
    } catch (err: any) {
        console.error('API /api/ai/analyze error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'AI analysis failed' },
            { status: 500 }
        );
    }
}
