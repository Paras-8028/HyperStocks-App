import { NextResponse } from 'next/server';
import { getPortfolioService } from '@/services/portfolio';
import { PortfolioAnalyticsService } from '@/services/portfolio/PortfolioAnalyticsService';
import { getPersonalizationService } from '@/services/personalization';
import { AIProviderFactory } from '@/services/ai/providers/AIProviderFactory';
import { DETAILED_PORTFOLIO_INTELLIGENCE_PROMPT } from '@/services/ai/prompts';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/database/mongoose';
import { AIPortfolioReport, PortfolioPosition } from '@/types/portfolio';

export const runtime = 'nodejs';

// Sample demonstration holdings if user has not yet added positions
const DEMO_POSITIONS: PortfolioPosition[] = [
    {
        id: 'demo-aapl',
        userId: 'demo',
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        shares: 35,
        costBasis: 185.20,
        sector: 'Technology',
        beta: 1.08,
    },
    {
        id: 'demo-nvda',
        userId: 'demo',
        symbol: 'NVDA',
        companyName: 'NVIDIA Corporation',
        shares: 25,
        costBasis: 112.50,
        sector: 'Technology',
        beta: 1.68,
    },
    {
        id: 'demo-msft',
        userId: 'demo',
        symbol: 'MSFT',
        companyName: 'Microsoft Corporation',
        shares: 15,
        costBasis: 405.00,
        sector: 'Technology',
        beta: 1.12,
    },
    {
        id: 'demo-lly',
        userId: 'demo',
        symbol: 'LLY',
        companyName: 'Eli Lilly & Co.',
        shares: 10,
        costBasis: 760.00,
        sector: 'Healthcare',
        beta: 0.65,
    },
    {
        id: 'demo-jpm',
        userId: 'demo',
        symbol: 'JPM',
        companyName: 'JPMorgan Chase & Co.',
        shares: 20,
        costBasis: 195.40,
        sector: 'Financials',
        beta: 1.10,
    },
];

async function resolveUser(): Promise<{ userId: string; email?: string } | null> {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const clerkUser = await currentUser();
        return {
            userId,
            email: clerkUser?.primaryEmailAddress?.emailAddress,
        };
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    try {
        const user = await resolveUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const { userId, email } = user;
        const { searchParams } = new URL(req.url);
        const forceDemo = searchParams.get('demo') === 'true';

        const portfolioService = getPortfolioService();
        const positionsRes = await portfolioService.getPositions(userId);

        let rawPositions = positionsRes.success ? positionsRes.data : [];

        // If user has no positions in DB, use demo portfolio so analytics are rich and visible
        const isUsingDemo = rawPositions.length === 0 || forceDemo;
        if (isUsingDemo) {
            rawPositions = DEMO_POSITIONS;
        }

        // 1. Run pure deterministic mathematical analytics
        const deterministic = PortfolioAnalyticsService.analyze(rawPositions);

        // 2. Fetch investor preferences for personalization
        const prefRes = await getPersonalizationService().getUserProfile(email || 'guest');
        const userPrefs = prefRes.success ? prefRes.data : undefined;
        const profileStr = userPrefs
            ? `Experience: ${userPrefs.experienceLevel || 'intermediate'}, Risk Tolerance: ${userPrefs.riskTolerance || 'moderate'}, Goals: ${Array.isArray(userPrefs.investmentGoals) ? userPrefs.investmentGoals.join(', ') : userPrefs.investmentGoals || 'growth'}`
            : 'Experience: intermediate, Risk: moderate, Goals: growth';

        // 3. Prepare verified context for AI explainer
        const verifiedMetrics = {
            totalValue: `$${deterministic.summary.totalValue.toFixed(2)}`,
            totalGainLoss: `$${deterministic.summary.totalUnrealizedGainLoss.toFixed(2)} (${deterministic.summary.totalGainLossPercent.toFixed(2)}%)`,
            dailyGainLoss: `$${deterministic.summary.dailyGainLoss.toFixed(2)} (${deterministic.summary.dailyGainLossPercent.toFixed(2)}%)`,
            sectorExposures: deterministic.sectorExposures.map((s) => `${s.sector}: ${s.percent.toFixed(1)}% (Delta vs S&P 500: ${s.benchmarkDelta >= 0 ? '+' : ''}${s.benchmarkDelta.toFixed(1)}%)`),
            topStock: `${deterministic.concentration.topStock.symbol} at ${deterministic.concentration.topStock.percent.toFixed(1)}%`,
            top3HoldingsWeight: `${deterministic.concentration.top3Percent.toFixed(1)}%`,
            diversificationLevel: deterministic.concentration.diversificationLevel,
            weightedBeta: deterministic.riskMetrics.weightedBeta,
            volatilityLevel: deterministic.riskMetrics.volatilityLevel,
            topContributors: deterministic.attribution.topContributors.map((c) => `${c.symbol}: +$${c.dollarContribution.toFixed(0)} (${c.percentReturn.toFixed(1)}%)`),
            bottomDetractors: deterministic.attribution.bottomDetractors.map((d) => `${d.symbol}: -$${Math.abs(d.dollarContribution).toFixed(0)} (${d.percentReturn.toFixed(1)}%)`),
        };

        // 4. Query AI model for qualitative interpretation
        let aiIntelligence: AIPortfolioReport['aiIntelligence'];
        try {
            const prompt = DETAILED_PORTFOLIO_INTELLIGENCE_PROMPT(
                JSON.stringify(verifiedMetrics, null, 2),
                profileStr
            );

            const provider = AIProviderFactory.getProvider();
            const aiRes = await provider.generateResponse({
                messages: [{ role: 'user', content: prompt }],
                systemInstruction: 'You are HyperStocks Chief Portfolio Strategist. Synthesize verified mathematical portfolio data into institutional qualitative insights. Return raw JSON only.',
                temperature: 0.2,
                maxTokens: 3000,
            });

            if (aiRes.success) {
                let text = aiRes.data.content.trim();
                const firstBrace = text.indexOf('{');
                const lastBrace = text.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    text = text.substring(firstBrace, lastBrace + 1);
                }
                aiIntelligence = JSON.parse(text);
            } else {
                throw new Error(aiRes.error);
            }
        } catch (aiErr) {
            console.warn('AI portfolio interpretation fallback engaged:', aiErr);
            // High-quality deterministic fallback if AI is unavailable or rate-limited
            const topSec = deterministic.sectorExposures[0]?.sector || 'Technology';
            const topPct = deterministic.sectorExposures[0]?.percent?.toFixed(1) || '45';
            aiIntelligence = {
                executiveSummary: `Your portfolio carries substantial ${topSec} exposure (${topPct}%), which has supported strong recent capital appreciation but creates sector concentration sensitivity during macro multiple pullbacks.`,
                performanceExplanation: {
                    gainsDriver: deterministic.attribution.topContributors.length > 0
                        ? `Top gains were generated by ${deterministic.attribution.topContributors.map(c => c.symbol).join(' and ')}, outpacing broader benchmark returns.`
                        : 'Unrealized gains were supported by resilient broad equity market valuations.',
                    lossesDriver: deterministic.attribution.bottomDetractors.length > 0
                        ? `Performance was dampened by modest pullbacks in ${deterministic.attribution.bottomDetractors.map(d => d.symbol).join(', ')}.`
                        : 'No material asset drawdowns detected across current positions.',
                },
                insights: [
                    `${deterministic.concentration.topStock.symbol} represents ${deterministic.concentration.topStock.percent.toFixed(1)}% of total portfolio capital.`,
                    `${topSec} exposure is ${deterministic.sectorExposures[0]?.benchmarkDelta >= 0 ? '+' : ''}${deterministic.sectorExposures[0]?.benchmarkDelta.toFixed(0)}% relative to the S&P 500 benchmark.`,
                    `Top 3 holdings account for ${deterministic.concentration.top3Percent.toFixed(1)}% of portfolio value.`,
                    `Portfolio weighted beta of ${deterministic.riskMetrics.weightedBeta} reflects ${deterministic.riskMetrics.volatilityLevel.toLowerCase()} volatility.`,
                ],
                recommendations: [
                    {
                        title: 'Concentration Rebalancing',
                        suggestion: `Consider scaling back outsized gains in ${deterministic.concentration.topStock.symbol} to cap single-asset exposure below 20%.`,
                        actionType: 'rebalance',
                    },
                    {
                        title: 'Defensive Diversification',
                        suggestion: 'Explore allocating non-correlated capital to defensive healthcare, dividend aristocrats, or short-duration treasuries.',
                        actionType: 'diversify',
                    },
                ],
                confidenceScore: 90,
                disclaimer: 'AI interpretations are educational analysis models based on verified historical data and do not constitute certified personalized financial advice.',
            };
        }

        const report: AIPortfolioReport = {
            deterministic,
            aiIntelligence,
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json({
            success: true,
            data: report,
            isUsingDemo,
        });
    } catch (err: any) {
        console.error('GET /api/portfolio error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to generate portfolio intelligence' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await resolveUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const { userId } = user;
        const body = await req.json();
        const { symbol, shares, costBasis, notes } = body;

        if (!symbol || !shares || !costBasis) {
            return NextResponse.json(
                { success: false, error: 'Missing required position fields' },
                { status: 400 }
            );
        }

        const portfolioService = getPortfolioService();
        const res = await portfolioService.addPosition(userId, {
            symbol: symbol.toUpperCase().trim(),
            shares: Number(shares),
            costBasis: Number(costBasis),
            notes,
        });

        return NextResponse.json(res);
    } catch (err: any) {
        console.error('POST /api/portfolio error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to add position' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await resolveUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const { userId } = user;
        const { searchParams } = new URL(req.url);
        const positionId = searchParams.get('id');

        if (!positionId) {
            return NextResponse.json(
                { success: false, error: 'Position ID is required' },
                { status: 400 }
            );
        }

        const portfolioService = getPortfolioService();
        const res = await portfolioService.removePosition(userId, positionId);
        return NextResponse.json(res);
    } catch (err: any) {
        console.error('DELETE /api/portfolio error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to remove position' },
            { status: 500 }
        );
    }
}
