import { NextResponse } from 'next/server';
import { getNewsService } from '@/services/news';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const symbolsParam = searchParams.get('symbols');
        const category = searchParams.get('category') || 'general';

        const newsService = getNewsService();

        if (symbolsParam) {
            const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);
            const res = await newsService.getCuratedWatchlistNews(symbols);
            return NextResponse.json(res);
        }

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
