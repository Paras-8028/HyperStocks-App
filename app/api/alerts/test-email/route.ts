import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getEmailService } from '@/services/email';
import { AlertEmailData, DailyDigestEmailData } from '@/types/email';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in to send a test email.' }, { status: 401 });
        }

        const clerkUser = await currentUser();
        const userEmail = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress;
        const userName = clerkUser?.fullName || clerkUser?.firstName || 'Valued Investor';

        if (!userEmail) {
            return NextResponse.json({ success: false, error: 'No verified email address found for the current authenticated user in Clerk.' }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const testType = body.type || 'price'; // price, percentage_movement, news, portfolio_risk, ai_insight, daily_digest

        const emailService = getEmailService();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        if (testType === 'daily_digest') {
            const digestData: DailyDigestEmailData = {
                userName: `[TEST] ${userName}`,
                userEmail,
                date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
                marketOverview: {
                    indices: [
                        { name: 'S&P 500 (SPY)', value: 582.40, change: 4.80, percentChange: 0.83 },
                        { name: 'NASDAQ (QQQ)', value: 494.20, change: 7.10, percentChange: 1.46 },
                        { name: 'Dow Jones (DIA)', value: 436.10, change: 1.50, percentChange: 0.35 },
                    ],
                    directionSummary: 'Risk-on session driven by semiconductor capex announcements and easing treasury yields.',
                    topSectors: [
                        { name: 'Semiconductors', change: 2.8 },
                        { name: 'Cloud Infrastructure', change: 1.6 },
                        { name: 'Utilities', change: -0.4 },
                    ],
                },
                aiMarketSummary: 'This is a simulation test of the HyperStocks Daily Market Intelligence digest. Institutional capital continues to support tech infrastructure with expanding order books.',
                watchlistMovers: [
                    { symbol: 'NVDA', companyName: 'NVIDIA Corp.', price: 128.45, change: 4.75, percentChange: 3.84 },
                    { symbol: 'AAPL', companyName: 'Apple Inc.', price: 224.12, change: 2.76, percentChange: 1.25 },
                    { symbol: 'MSFT', companyName: 'Microsoft Corp.', price: 448.90, change: 9.20, percentChange: 2.10 },
                ],
                portfolioSummary: {
                    totalValue: 128450.00,
                    dailyGainLoss: 2450.00,
                    dailyGainLossPercent: 1.94,
                    topContributor: 'NVDA',
                    topDetractor: 'TSLA',
                },
                topNews: [
                    {
                        headline: 'Enterprise AI Spending Surges Beyond Expectations in Q3 Surveys',
                        source: 'Financial Times',
                        summary: 'Institutional surveys reveal accelerating IT budgets allocated toward generative AI infrastructure.',
                        url: `${baseUrl}/news`,
                    },
                ],
                catalystsToWatch: [
                    { title: 'Federal Reserve Monetary Policy Rate Decision', type: 'fed', dateOrTime: 'Wednesday 2:00 PM EST', impact: 'Key benchmark interest rate announcement' },
                ],
                hyperstocksUrl: baseUrl,
            };

            const result = await emailService.sendDailyDigestEmail(digestData);
            return NextResponse.json({
                success: result.success,
                testType: 'daily_digest',
                recipient: userEmail,
                messageId: result.id,
                skipped: result.skipped,
                reason: result.reason,
                error: result.error,
            });
        }

        // Single alert simulation
        const alertData: AlertEmailData = {
            userName: `[TEST] ${userName}`,
            userEmail,
            alertType: testType,
            ticker: testType === 'portfolio_risk' ? 'NVDA' : 'AAPL',
            companyName: testType === 'portfolio_risk' ? 'NVIDIA Corporation' : 'Apple Inc.',
            currentPrice: testType === 'portfolio_risk' ? 128.45 : 252.40,
            previousPrice: testType === 'portfolio_risk' ? 123.70 : 247.10,
            priceChange: testType === 'portfolio_risk' ? 4.75 : 5.30,
            percentageChange: testType === 'portfolio_risk' ? 3.84 : 2.14,
            triggerValue: testType === 'price' ? 250.00 : undefined,
            triggerCondition: testType === 'price' ? 'above' : undefined,
            volume: 58420000,
            averageVolume: 42100000,
            sentiment: 'bullish',
            marketContext: {
                sp500Change: 0.83,
                nasdaqChange: 1.46,
                sectorName: 'Technology Hardware & Semiconductors',
                sectorPerformance: 1.85,
            },
            relevantNews: [
                {
                    headline: 'Supply Chain Inflows Signal Accelerating Production Schedules',
                    source: 'Bloomberg Markets',
                    summary: 'Component manufacturers report robust pre-orders with sustained enterprise demand.',
                    url: `${baseUrl}/stocks/AAPL`,
                },
            ],
            portfolioContext: {
                totalValue: 128450.00,
                dailyChange: 2450.00,
                dailyPercent: 1.94,
                positionWeight: 14.5,
                sharesHeld: 80,
            },
            aiSummary: 'This is an authentic test transmission from the HyperStocks Intelligence Engine. Order book expansion and dynamic trend persistence were verified.',
            aiAnalysis: 'This is an authentic test transmission from the HyperStocks Intelligence Engine. Order book expansion and dynamic trend persistence were verified.',
            riskLevel: testType === 'portfolio_risk' ? 'elevated' : 'low',
            whyItMatters: `This is a test notification dispatched to verify your SMTP delivery configuration. In live trading, this section highlights your personalized portfolio exposure and watchlist status.`,
            hyperstocksUrl: baseUrl,
            timestamp: Date.now(),
            detectedSignal: testType === 'ai_insight' ? 'Volume 2.8× Trailing 30-Day Average' : undefined,
        };

        const result = await emailService.sendAlertEmail(alertData);

        return NextResponse.json({
            success: result.success,
            testType,
            recipient: userEmail,
            messageId: result.id,
            skipped: result.skipped,
            reason: result.reason,
            error: result.error,
        });
    } catch (err: any) {
        console.error('POST /api/alerts/test-email error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to dispatch test email' },
            { status: 500 }
        );
    }
}
