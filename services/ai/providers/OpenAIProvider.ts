import { IAIProvider, AIProviderRequest, AIProviderResponse } from './IAIProvider';
import { ApiResult } from '@/types/api';

export class OpenAIProvider implements IAIProvider {
    readonly name = 'OpenAI';
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.openai.com/v1';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    }

    get isAvailable(): boolean {
        return Boolean(this.apiKey);
    }

    async generateResponse(req: AIProviderRequest): Promise<ApiResult<AIProviderResponse>> {
        if (!this.isAvailable) {
            return {
                success: false,
                error: 'OPENAI_API_KEY environment variable is not configured',
                code: 'MISSING_API_KEY',
            };
        }

        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const url = `${this.baseUrl}/chat/completions`;

        const messages = [];
        if (req.systemInstruction) {
            messages.push({ role: 'system', content: req.systemInstruction });
        }
        for (const m of req.messages) {
            messages.push({ role: m.role, content: m.content });
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: req.temperature ?? 0.3,
                    max_tokens: req.maxTokens ?? 2048,
                }),
                cache: 'no-store',
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                return {
                    success: false,
                    error: `OpenAI API error ${res.status}: ${text}`,
                    code: res.status,
                };
            }

            const data = await res.json();
            const choice = data.choices?.[0];

            return {
                success: true,
                data: {
                    content: choice?.message?.content || '',
                    provider: this.name,
                    model,
                    finishReason: choice?.finish_reason,
                },
            };
        } catch (err: any) {
            return {
                success: false,
                error: err?.message || 'Failed to call OpenAI API',
                code: 'NETWORK_ERROR',
            };
        }
    }

    async generateStream(req: AIProviderRequest): Promise<ReadableStream<Uint8Array>> {
        if (!this.isAvailable) {
            throw new Error('OPENAI_API_KEY environment variable is not configured');
        }

        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const url = `${this.baseUrl}/chat/completions`;

        const messages = [];
        if (req.systemInstruction) {
            messages.push({ role: 'system', content: req.systemInstruction });
        }
        for (const m of req.messages) {
            messages.push({ role: m.role, content: m.content });
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: req.temperature ?? 0.3,
                max_tokens: req.maxTokens ?? 2048,
                stream: true,
            }),
            cache: 'no-store',
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`OpenAI Stream Error ${res.status}: ${errText}`);
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = res.body?.getReader();

        if (!reader) throw new Error('OpenAI stream response body is null');

        let buffer = '';

        return new ReadableStream<Uint8Array>({
            async pull(controller) {
                try {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        return;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('data: ')) {
                            const jsonStr = trimmed.slice(6);
                            if (jsonStr === '[DONE]') {
                                controller.close();
                                return;
                            }
                            try {
                                const parsed = JSON.parse(jsonStr);
                                const textChunk = parsed?.choices?.[0]?.delta?.content;
                                if (textChunk) {
                                    controller.enqueue(
                                        encoder.encode(`data: ${JSON.stringify({ text: textChunk })}\n\n`)
                                    );
                                }
                            } catch {
                                // Ignore
                            }
                        }
                    }
                } catch (err) {
                    controller.error(err);
                }
            },
            cancel() {
                reader.cancel();
            },
        });
    }
}
