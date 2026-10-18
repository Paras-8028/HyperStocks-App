import { NextResponse } from 'next/server';
import { getAIService } from '@/services/ai';
import { getMarketService } from '@/services/market';
import { AIStructuredError } from '@/services/ai/aiErrorHandling';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, context } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Messages array is required and cannot be empty' },
                { status: 400 }
            );
        }

        if (messages.length > 50) {
            return NextResponse.json(
                { success: false, error: 'Conversation history exceeds maximum permitted length (50 messages)' },
                { status: 400 }
            );
        }

        for (const msg of messages) {
            if (!msg || typeof msg !== 'object' || typeof msg.content !== 'string') {
                return NextResponse.json(
                    { success: false, error: 'Malformed message in history' },
                    { status: 400 }
                );
            }
            if (msg.content.length > 4000) {
                return NextResponse.json(
                    { success: false, error: 'Individual message content exceeds 4000 characters limit' },
                    { status: 400 }
                );
            }
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

        if (!result.success) {
            const structured: AIStructuredError | undefined = result.structuredError;
            const status = structured?.status || (typeof result.code === 'number' ? result.code : 500);
            return NextResponse.json(
                {
                    success: false,
                    error: structured || {
                        code: 'AI_SERVICE_ERROR',
                        message: result.error,
                        status,
                        retryable: false,
                    },
                },
                {
                    status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500,
                    headers: structured?.retryAfterSeconds
                        ? { 'Retry-After': String(structured.retryAfterSeconds) }
                        : undefined,
                }
            );
        }

        return NextResponse.json(result);
    } catch (err: any) {
        console.error('API /api/ai/chat error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Chat service failed' },
            { status: 500 }
        );
    }
}
