import { NextResponse } from 'next/server';
import { getPersonalizationService } from '@/services/personalization';
import { auth } from '@clerk/nextjs/server';
import { OpportunityItem } from '@/types/ai';
import { RawInsightItem } from '@/services/personalization/InsightRanking';
import { RiskRadarItem } from '@/types/ai';

// Base universe of candidate opportunities
const CANDIDATE_OPPORTUNITIES: OpportunityItem[] = [
    {
        symbol: 'AMD',
        company: 'Advanced Micro Devices',
        thesis: 'AI server accelerator market share expansion with attractive price-to-earnings growth (PEG) ratio.',
        catalyst: 'Enterprise benchmark release & new cloud hyperscaler deployment announcements.',
        metricsHighlight: 'P/E: 32.4 | Fwd Rev Growth: +28%',
        confidence: 88,
        timeframe: 'Medium Term',
        risk: 'Medium',
    },
    {
        symbol: 'LLY',
        company: 'Eli Lilly & Co.',
        thesis: 'Sustained commercial pipeline dominance in cardiometabolic therapeutics and high operating margins.',
        catalyst: 'Quarterly supply capacity expansion coming online across international distribution hubs.',
        metricsHighlight: 'Operating Margin: 34.2% | EPS +42% YoY',
        confidence: 92,
        timeframe: 'Long Term',
        risk: 'Low',
    },
    {
        symbol: 'UBER',
        company: 'Uber Technologies',
        thesis: 'Free cash flow inflection point paired with aggressive share repurchase program execution.',
        catalyst: 'Mobility take-rate stabilization and enterprise delivery advertising revenue ramp.',
        metricsHighlight: 'FCF Margin: 12.8% | Net Income +120%',
        confidence: 85,
        timeframe: 'Short Term',
        risk: 'Medium',
    },
    {
        symbol: 'NVDA',
        company: 'NVIDIA Corporation',
        thesis: 'Unmatched hardware and CUDA software ecosystem leadership in sovereign and enterprise generative AI.',
        catalyst: 'Blackwell GPU volume shipments ramp across major cloud service providers.',
        metricsHighlight: 'Gross Margin: 74.8% | Fwd P/E: 38.2x',
        confidence: 94,
        timeframe: 'Long Term',
        risk: 'Medium',
    },
    {
        symbol: 'JNJ',
        company: 'Johnson & Johnson',
        thesis: 'High free cash flow generation, 62-year dividend growth record, and defensive medical technology demand.',
        catalyst: 'Innovative medicine pipeline approvals and steady surgical device utilization recovery.',
        metricsHighlight: 'Div Yield: 3.1% | Beta: 0.54 | P/E: 16.8x',
        confidence: 90,
        timeframe: 'Long Term',
        risk: 'Low',
    },
    {
        symbol: 'JPM',
        company: 'JPMorgan Chase & Co.',
        thesis: 'Premier fortress balance sheet with industry-leading net interest income and investment banking recovery.',
        catalyst: 'Capital markets advisory fee acceleration and private credit asset expansion.',
        metricsHighlight: 'ROTCE: 20.4% | P/TBV: 2.1x | Div Yield: 2.3%',
        confidence: 89,
        timeframe: 'Medium Term',
        risk: 'Low',
    },
    {
        symbol: 'PLTR',
        company: 'Palantir Technologies',
        thesis: 'Explosive US commercial AIP adoption converting pilot customers into multi-million recurring enterprise licenses.',
        catalyst: 'S&P 500 inclusion rebalancing inflows and defense software contract expansion.',
        metricsHighlight: 'US Commercial Rev +54% YoY | Rule of 40: 64%',
        confidence: 86,
        timeframe: 'Short Term',
        risk: 'High',
    },
];

// Base pool of market insights
const CANDIDATE_INSIGHTS: RawInsightItem[] = [
    {
        id: 'feed-1',
        category: 'volume',
        content: 'Apple (AAPL) trading volume is 45% above its 30-day moving average on institutional buying.',
        relatedSymbol: 'AAPL',
        sector: 'Technology',
        timeAgo: '8m ago',
    },
    {
        id: 'feed-2',
        category: 'sentiment',
        content: 'Technology sector sentiment score improved significantly (+0.78) following resilient datacenter cloud capex reports.',
        sector: 'Technology',
        timeAgo: '19m ago',
    },
    {
        id: 'feed-3',
        category: 'technical',
        content: 'The S&P 500 (SPY) is testing its upper ascending channel resistance line with constructive market breadth.',
        relatedSymbol: 'SPY',
        timeAgo: '35m ago',
    },
    {
        id: 'feed-4',
        category: 'volume',
        content: 'Semiconductor ETF (SMH) block buy order detected in dark pools at $248.50 level.',
        relatedSymbol: 'NVDA',
        sector: 'Technology',
        timeAgo: '52m ago',
    },
    {
        id: 'feed-5',
        category: 'macro',
        content: 'US 2-Year / 10-Year Treasury Yield curve gap narrowed by 6 basis points following retail sales data.',
        timeAgo: '1h ago',
    },
    {
        id: 'feed-6',
        category: 'technical',
        content: 'Microsoft (MSFT) 14-day RSI reset from overbought (72) back to neutral (54), forming an orderly bull flag.',
        relatedSymbol: 'MSFT',
        sector: 'Technology',
        timeAgo: '2h ago',
    },
    {
        id: 'feed-7',
        category: 'fundamental',
        content: 'Eli Lilly (LLY) gross margins reached 81.2%, outpacing sector median by 240 basis points amid high-volume therapy ramp.',
        relatedSymbol: 'LLY',
        sector: 'Healthcare',
        timeAgo: '2h ago',
    },
    {
        id: 'feed-8',
        category: 'risk',
        severity: 'warning',
        content: 'Federal Reserve rate cut path repriced slightly higher as core services inflation shows persistent stickiness.',
        timeAgo: '3h ago',
    },
    {
        id: 'feed-9',
        category: 'fundamental',
        content: 'JPMorgan Chase (JPM) declared quarterly dividend increase, reinforcing fortress capital adequacy ratio above regulatory minimums.',
        relatedSymbol: 'JPM',
        sector: 'Financials',
        timeAgo: '4h ago',
    },
];

// Base pool of risk radar items
const CANDIDATE_RISKS: RiskRadarItem[] = [
    {
        id: 'risk-1',
        category: 'concentration',
        severity: 'warning',
        title: 'Technology Sector Concentration > 42%',
        description: 'Your combined holdings and watchlist have heavy exposure to AI semiconductors and mega-cap tech. A macro multiples contraction would disproportionately affect net performance.',
        affectedSymbols: ['NVDA', 'AAPL', 'MSFT'],
        suggestedAction: 'Consider diversifying into defensive dividend healthcare (e.g. JNJ, LLY) or short-duration treasuries.',
    },
    {
        id: 'risk-2',
        category: 'volatility',
        severity: 'critical',
        title: 'Implied Volatility Surge Ahead of Fed Meeting',
        description: '30-day VIX forward curve shows backwardation. Short-term options pricing indicates heightened tail-risk expectations across the S&P 500.',
        affectedSymbols: ['SPY', 'QQQ'],
        suggestedAction: 'Review stop-loss levels and ensure active price alerts are configured for high-beta holdings.',
    },
    {
        id: 'risk-3',
        category: 'sentiment',
        severity: 'advisory',
        title: 'Energy Sector Regulatory & Pricing Drag',
        description: 'Negative sentiment score (-0.45) across fossil fuel producers due to international supply additions and refinery utilization cuts.',
        affectedSymbols: ['XOM', 'CVX'],
        suggestedAction: 'Hold back on fresh long entries until crude inventories show inventory draw stabilization.',
    },
    {
        id: 'risk-4',
        category: 'macro',
        severity: 'advisory',
        title: 'Stretched Price-to-Sales Multiple in Cloud Software',
        description: 'Selected high-growth cloud SaaS multiples are approaching 18x EV/Sales without GAAP profitability support.',
        affectedSymbols: ['PLTR', 'SNOW'],
        suggestedAction: 'Prioritize companies with free cash flow support over purely multiple-driven growth.',
    },
];

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { watchlistSymbols = [], holdings = [], preferences: clientPrefs } = body;

        const { userId } = await auth();
        const userIdentifier = userId || 'guest';
        const personalizationService = getPersonalizationService();

        // Get server preferences or merge with client preferences
        const prefRes = await personalizationService.getUserProfile(userIdentifier);
        const serverPrefs = prefRes.success ? prefRes.data : undefined;
        const activePrefs = {
            ...(serverPrefs || {}),
            ...(clientPrefs || {}),
        };

        const context = await personalizationService.getPersonalizationContext(
            userIdentifier,
            watchlistSymbols,
            holdings
        );
        // Ensure client preferences override context if provided
        context.profile.preferences = {
            ...context.profile.preferences,
            ...activePrefs,
        };

        // 1. Rank insights using rule engine
        const rankedInsights = personalizationService.rankInsights(CANDIDATE_INSIGHTS, context);

        // 2. Recommend opportunities using recommendation engine
        const recommendations = personalizationService.getRecommendations(
            CANDIDATE_OPPORTUNITIES,
            context,
            4
        );

        // 3. Filter/prioritize risks based on risk tolerance & holdings
        const riskTolerance = (context.profile.preferences.riskTolerance || 'moderate').toLowerCase();
        const prioritizedRisks = [...CANDIDATE_RISKS].sort((a, b) => {
            if (riskTolerance === 'conservative' || riskTolerance === 'low') {
                if (a.severity === 'critical') return -1;
                if (b.severity === 'critical') return 1;
            }
            return 0;
        });

        return NextResponse.json({
            success: true,
            data: {
                insights: rankedInsights,
                recommendations,
                risks: prioritizedRisks,
                context: {
                    experienceLevel: context.profile.preferences.experienceLevel,
                    riskTolerance: context.profile.preferences.riskTolerance,
                    investmentGoals: context.profile.preferences.investmentGoals,
                    preferredSectors: context.profile.preferences.preferredSectors,
                    analysisStyle: context.profile.preferences.preferredAnalysisStyle,
                },
            },
        });
    } catch (err: any) {
        console.error('POST /api/personalization/feed error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to generate personalized feed' },
            { status: 500 }
        );
    }
}
