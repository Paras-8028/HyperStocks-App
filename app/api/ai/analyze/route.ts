import { NextResponse } from 'next/server';
import { getAIService } from '@/services/ai';
import { getMarketService } from '@/services/market';
import { getNewsService } from '@/services/news';
import { AIProviderFactory } from '@/services/ai/providers/AIProviderFactory';
import { DETAILED_STOCK_INTELLIGENCE_PROMPT } from '@/services/ai/prompts';
import { auth } from '@clerk/nextjs/server';
import { getPersonalizationService } from '@/services/personalization';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { type = 'stock_thesis', symbol, context, positions, watchlistSymbols, userPreferences } = body;
        const aiService = getAIService();
        const marketService = getMarketService();

        // 0. Comprehensive 8-Pillar Detailed Stock Intelligence
        if (type === 'detailed_stock_intelligence' || type === 'stock_intelligence') {
            if (!symbol) {
                return NextResponse.json(
                    { success: false, error: 'Symbol parameter is required' },
                    { status: 400 }
                );
            }

            const cleanSymbol = symbol.toUpperCase().trim();
            const newsService = getNewsService();

            let quote = context?.quote;
            let metrics = context?.metrics;
            let profile = context?.profile;

            if (!quote) {
                const quoteRes = await marketService.getQuote(cleanSymbol);
                if (quoteRes.success) quote = quoteRes.data;
            }
            if (!metrics) {
                const metricsRes = await marketService.getFinancialMetrics(cleanSymbol);
                if (metricsRes.success) metrics = metricsRes.data;
            }
            if (!profile) {
                const profRes = await marketService.getCompanyProfile(cleanSymbol);
                if (profRes.success) profile = profRes.data;
            }

            const newsRes = await newsService.getCompanyNews(cleanSymbol, 7);
            const newsArticles = newsRes.success ? newsRes.data.slice(0, 4) : [];

            const quoteStr = quote
                ? `Price: $${quote.currentPrice}, Change: ${quote.percentChange}%, 52W High: $${metrics?.fiftyTwoWeekHigh ?? 'N/A'}, 52W Low: $${metrics?.fiftyTwoWeekLow ?? 'N/A'}`
                : 'Quote pending';

            const metricsStr = metrics
                ? `P/E Ratio: ${metrics.peRatio ?? 'N/A'}, P/B: ${metrics.pbRatio ?? 'N/A'}, Beta: ${metrics.beta ?? 'N/A'}, Div Yield: ${metrics.dividendYield ?? 0}%`
                : 'Metrics pending';

            const newsStr = newsArticles.length > 0
                ? newsArticles.map((a) => `- [${a.source}] ${a.headline}: ${a.summary.slice(0, 140)}...`).join('\n')
                : 'No recent breaking news';

            const prompt = DETAILED_STOCK_INTELLIGENCE_PROMPT(
                cleanSymbol,
                profile?.name || cleanSymbol,
                quoteStr,
                metricsStr,
                newsStr
            );

            const provider = AIProviderFactory.getProvider();
            const aiRes = await provider.generateResponse({
                messages: [{ role: 'user', content: prompt }],
                systemInstruction: 'You are HyperStocks institutional equity research engine. Output valid raw JSON only.',
                temperature: 0.2,
            });

            if (!aiRes.success) {
                return NextResponse.json(aiRes, { status: 500 });
            }

            try {
                let text = aiRes.data.content.trim();
                const firstBrace = text.indexOf('{');
                const lastBrace = text.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    text = text.substring(firstBrace, lastBrace + 1);
                } else {
                    if (text.startsWith('```json')) text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
                    else if (text.startsWith('```')) text = text.replace(/^```\s*/, '').replace(/```\s*$/, '');
                }
                const parsed = JSON.parse(text.trim());
                return NextResponse.json({ success: true, data: parsed });
            } catch (err: any) {
                return NextResponse.json({
                    success: false,
                    error: `Failed to parse stock intelligence: ${err?.message}`,
                }, { status: 500 });
            }
        }

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
