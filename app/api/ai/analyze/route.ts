import { NextResponse } from 'next/server';
import { getAIService } from '@/services/ai';
import { getMarketService } from '@/services/market';
import { getNewsService } from '@/services/news';
import { AIProviderFactory } from '@/services/ai/providers/AIProviderFactory';
import { DETAILED_STOCK_INTELLIGENCE_PROMPT } from '@/services/ai/prompts';
import { auth } from '@clerk/nextjs/server';
import { aiAnalysisCache, AIStructuredError } from '@/services/ai/aiErrorHandling';

function formatErrorResponse(err: any, fallbackStatus: number = 500) {
    const structured: AIStructuredError | undefined =
        err?.structuredError || (typeof err === 'object' && err?.code ? err : undefined);
    const status = structured?.status || (typeof err?.code === 'number' ? err.code : fallbackStatus);
    const retryAfter = structured?.retryAfterSeconds;

    return NextResponse.json(
        {
            success: false,
            error: structured || {
                code: 'AI_SERVICE_ERROR',
                message: err?.message || err?.error || 'AI analysis failed',
                status,
                retryable: false,
            },
        },
        {
            status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500,
            headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
        }
    );
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            type = 'stock_thesis',
            symbol,
            context,
            positions,
            watchlistSymbols,
            userPreferences,
            forceRefresh = false,
        } = body;

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
            const cacheKey = `detailed_stock_intelligence:${cleanSymbol}`;

            // Check server-side cache unless client explicitly requests forceRefresh
            if (!forceRefresh) {
                const cached = aiAnalysisCache.get<any>(cacheKey);
                if (cached) {
                    return NextResponse.json({
                        success: true,
                        data: cached.data,
                        cached: true,
                        cachedAt: cached.cachedAt,
                    });
                }
            }

            // Deduplicate concurrent in-flight requests for the exact same symbol
            const analysisResult = await aiAnalysisCache.deduplicate(cacheKey, async () => {
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
                    throw aiRes;
                }

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
                aiAnalysisCache.set(cacheKey, parsed);
                return parsed;
            }).catch((err) => {
                return { __error: err };
            });

            if ('__error' in analysisResult) {
                return formatErrorResponse(analysisResult.__error);
            }

            return NextResponse.json({ success: true, data: analysisResult });
        }

        // 1. Stock Thesis
        if (type === 'stock_thesis') {
            if (!symbol) {
                return NextResponse.json(
                    { success: false, error: 'Symbol parameter is required' },
                    { status: 400 }
                );
            }

            const cleanSymbol = symbol.toUpperCase().trim();
            const cacheKey = `stock_thesis:${cleanSymbol}`;

            if (!forceRefresh) {
                const cached = aiAnalysisCache.get<any>(cacheKey);
                if (cached) {
                    return NextResponse.json({
                        success: true,
                        data: cached.data,
                        cached: true,
                        cachedAt: cached.cachedAt,
                    });
                }
            }

            const thesisResult = await aiAnalysisCache.deduplicate(cacheKey, async () => {
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

                const res = await aiService.generateStockThesis(cleanSymbol, {
                    currentSymbol: cleanSymbol,
                    quote,
                    metrics,
                    profile,
                });

                if (!res.success) {
                    throw res;
                }

                aiAnalysisCache.set(cacheKey, res.data);
                return res.data;
            }).catch((err) => {
                return { __error: err };
            });

            if ('__error' in thesisResult) {
                return formatErrorResponse(thesisResult.__error);
            }

            return NextResponse.json({ success: true, data: thesisResult });
        }

        // 2. Portfolio Risk Audit
        if (type === 'portfolio_audit') {
            const auditResult = await aiService.auditPortfolioRisk(
                positions || [],
                userPreferences
            );

            if (!auditResult.success) {
                return formatErrorResponse(auditResult);
            }

            return NextResponse.json(auditResult);
        }

        // 3. Personalized Market Briefing
        if (type === 'market_briefing') {
            const symbolsList = (watchlistSymbols || []).slice().sort().join(',');
            const cacheKey = `market_briefing:${userId}:${symbolsList}`;

            if (!forceRefresh) {
                const cached = aiAnalysisCache.get<any>(cacheKey);
                if (cached) {
                    return NextResponse.json({
                        success: true,
                        data: cached.data,
                        cached: true,
                        cachedAt: cached.cachedAt,
                    });
                }
            }

            const briefingResult = await aiAnalysisCache.deduplicate(cacheKey, async () => {
                const res = await aiService.generateMarketBriefing(
                    watchlistSymbols || [],
                    userPreferences
                );
                if (!res.success) {
                    throw res;
                }
                aiAnalysisCache.set(cacheKey, res.data);
                return res.data;
            }).catch((err) => {
                return { __error: err };
            });

            if ('__error' in briefingResult) {
                return formatErrorResponse(briefingResult.__error);
            }

            return NextResponse.json({ success: true, data: briefingResult });
        }

        return NextResponse.json(
            { success: false, error: `Unsupported analysis type: ${type}` },
            { status: 400 }
        );
    } catch (err: any) {
        console.error('API /api/ai/analyze error:', err);
        return formatErrorResponse(err);
    }
}
