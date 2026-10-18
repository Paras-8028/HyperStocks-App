import { NextRequest, NextResponse } from 'next/server';
import { getMarketService } from '@/services/market';
import { DownsideRiskEngine } from '@/services/risk/DownsideRiskEngine';

export const revalidate = 300; // 5 minutes cache

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await context.params;
        const cleanSymbol = (symbol || '').trim().toUpperCase();

        if (!cleanSymbol) {
            return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 });
        }

        const marketService = getMarketService();
        const nowSec = Math.floor(Date.now() / 1000);
        const oneYearAgoSec = nowSec - 365 * 24 * 60 * 60;

        const [quoteRes, candleRes, profileRes] = await Promise.all([
            marketService.getQuote(cleanSymbol),
            marketService.getCandles(cleanSymbol, 'D', oneYearAgoSec, nowSec),
            marketService.getCompanyProfile(cleanSymbol),
        ]);

        const quote = quoteRes.success ? quoteRes.data : undefined;
        const candles = candleRes.success ? candleRes.data : undefined;
        const companyName = profileRes.success ? profileRes.data.name : cleanSymbol;

        const assessment = DownsideRiskEngine.assessDownsideRisk(
            cleanSymbol,
            companyName,
            candles,
            quote
        );

        return NextResponse.json({
            success: true,
            symbol: cleanSymbol,
            assessment,
        });
    } catch (err: any) {
        console.error('[API /api/stocks/[symbol]/risk] Error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Error computing downside risk assessment' },
            { status: 500 }
        );
    }
}
