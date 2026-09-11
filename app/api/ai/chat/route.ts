import { NextResponse } from 'next/server';
import { getAIService } from '@/services/ai';
import { getMarketService } from '@/services/market';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, context } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { success: false, error: 'Messages array is required' },
                { status: 400 }
            );
        }

        const aiService = getAIService();
        const marketService = getMarketService();

        // If a symbol is in context, enrich with live quote if not present
        let enrichedContext = { ...context };
        if (context?.currentSymbol && !context?.quote) {
            const quoteRes = await marketService.getQuote(context.currentSymbol);
            if (quoteRes.success) {
                enrichedContext.quote = quoteRes.data;
            }
        }

        const result = await aiService.chatCopilot(messages, enrichedContext);
        return NextResponse.json(result);
    } catch (err: any) {
        console.error('API /api/ai/chat error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Chat service failed' },
            { status: 500 }
        );
    }
}
