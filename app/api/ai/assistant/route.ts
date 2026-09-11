import { NextResponse } from 'next/server';
import { AIProviderFactory } from '@/services/ai/providers/AIProviderFactory';
import { AIContextBuilder } from '@/services/ai/context/AIContextBuilder';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';

export const runtime = 'nodejs';

async function resolveUserIdentity(): Promise<{ userId?: string; userEmail?: string }> {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (session?.user?.email) {
            const userEmail = session.user.email;
            let userId = session.user.id;

            const mongoose = await connectToDatabase();
            const db = mongoose.connection.db;
            if (db) {
                const u = await db.collection('user').findOne({ email: userEmail });
                if (u) userId = u.id || String(u._id);
            }

            return { userId, userEmail };
        }
    } catch {
        // Fallback for unauthenticated access
    }
    return {};
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, currentSymbol, stream = true } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Messages array is required' },
                { status: 400 }
            );
        }

        const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
        const queryText = lastUserMessage?.content || '';

        // 1. Resolve user context
        const { userId, userEmail } = await resolveUserIdentity();

        // 2. Build live dynamic financial context
        const { contextData, formattedContextString } = await AIContextBuilder.buildContext(
            queryText,
            {
                userId,
                userEmail,
                currentSymbol,
            }
        );

        // 3. System prompt construction
        const systemInstruction = `
You are HyperStocks AI Financial Assistant, an institutional-grade stock intelligence copilot.
Your mission is to provide accurate, objective, data-backed financial analysis and insights.

REAL-TIME FINANCIAL CONTEXT:
${formattedContextString ? formattedContextString : 'No specific tickers or portfolio items detected in query.'}

RESPONSE GUIDELINES:
1. Ground your answers in the real-time financial context provided above.
2. If comparing stocks (e.g. Apple vs Microsoft), provide a concise markdown comparison table covering Price, Change, and P/E ratio.
3. If explaining why a stock is up/down, cite the specific catalysts and news headlines from context.
4. Keep paragraphs short, scannable, and highlight metrics in **bold**.
5. Conclude EVERY response with an italicized regulatory disclaimer:
   *Disclaimer: HyperStocks AI provides informational market intelligence and not certified financial advice. Past performance is no guarantee of future returns.*
`;

        const provider = AIProviderFactory.getProvider();

        // 4. Handle Streaming Response
        if (stream) {
            try {
                const streamBody = await provider.generateStream({
                    messages,
                    systemInstruction,
                    temperature: 0.2,
                });

                return new Response(streamBody, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache, no-transform',
                        Connection: 'keep-alive',
                    },
                });
            } catch (streamErr: any) {
                console.warn('Streaming failed, falling back to JSON response:', streamErr?.message);
                // Fallback to non-streaming if stream throws
            }
        }

        // 5. Non-streaming JSON response
        const result = await provider.generateResponse({
            messages,
            systemInstruction,
            temperature: 0.2,
        });

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                message: {
                    id: `asst-${Date.now()}`,
                    role: 'assistant',
                    content: result.data.content,
                    timestamp: Date.now(),
                    model: result.data.model,
                    provider: result.data.provider,
                },
                contextSummary: {
                    symbols: contextData.mentionedSymbols,
                    hasPortfolio: Boolean(contextData.portfolio),
                },
            },
        });
    } catch (err: any) {
        console.error('API /api/ai/assistant error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'AI Assistant service encountered an error' },
            { status: 500 }
        );
    }
}
