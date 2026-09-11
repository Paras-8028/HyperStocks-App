import { IAIProvider, AIProviderRequest, AIProviderResponse } from './IAIProvider';
import { ApiResult } from '@/types/api';
import { AI_CONFIG } from '@/config/ai';

export class GeminiProvider implements IAIProvider {
    readonly name = 'Google Gemini';
    private readonly apiKey: string;
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    }

    get isAvailable(): boolean {
        return Boolean(this.apiKey);
    }

    private formatContents(req: AIProviderRequest) {
        return req.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }));
    }

    async generateResponse(req: AIProviderRequest): Promise<ApiResult<AIProviderResponse>> {
        if (!this.isAvailable) {
            return {
                success: false,
                error: 'GEMINI_API_KEY environment variable is not configured',
                code: 'MISSING_API_KEY',
            };
        }

        const model = AI_CONFIG.defaultModel;
        const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

        const payload: any = {
            contents: this.formatContents(req),
            generationConfig: {
                temperature: req.temperature ?? AI_CONFIG.temperature,
                maxOutputTokens: req.maxTokens ?? AI_CONFIG.maxTokens,
            },
        };

        if (req.systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: req.systemInstruction }],
            };
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                cache: 'no-store',
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                // Fallback to gemini-1.5-flash if 2.5 is unavailable
                if (model !== AI_CONFIG.fallbackModel) {
                    const fallbackUrl = `${this.baseUrl}/${AI_CONFIG.fallbackModel}:generateContent?key=${this.apiKey}`;
                    const fbRes = await fetch(fallbackUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        cache: 'no-store',
                    });
                    if (fbRes.ok) {
                        const fbData = await fbRes.json();
                        const fbText = fbData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        return {
                            success: true,
                            data: {
                                content: fbText,
                                provider: this.name,
                                model: AI_CONFIG.fallbackModel,
                            },
                        };
                    }
                }
                return {
                    success: false,
                    error: `Gemini API error ${res.status}: ${text}`,
                    code: res.status,
                };
            }

            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                return {
                    success: false,
                    error: 'Gemini returned an empty response',
                    code: 'EMPTY_RESPONSE',
                };
            }

            return {
                success: true,
                data: {
                    content: text,
                    provider: this.name,
                    model,
                    finishReason: data?.candidates?.[0]?.finishReason,
                },
            };
        } catch (err: any) {
            console.error('GeminiProvider error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to call Gemini API',
                code: 'NETWORK_ERROR',
            };
        }
    }

    async generateStream(req: AIProviderRequest): Promise<ReadableStream<Uint8Array>> {
        if (!this.isAvailable) {
            throw new Error('GEMINI_API_KEY environment variable is not configured');
        }

        const model = AI_CONFIG.defaultModel;
        const url = `${this.baseUrl}/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

        const payload: any = {
            contents: this.formatContents(req),
            generationConfig: {
                temperature: req.temperature ?? AI_CONFIG.temperature,
                maxOutputTokens: req.maxTokens ?? AI_CONFIG.maxTokens,
            },
        };

        if (req.systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: req.systemInstruction }],
            };
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Gemini Stream Error ${res.status}: ${errText}`);
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = res.body?.getReader();

        if (!reader) {
            throw new Error('Gemini stream response body is null');
        }

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
                            try {
                                const parsed = JSON.parse(jsonStr);
                                const textChunk =
                                    parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (textChunk) {
                                    // Send SSE data event
                                    controller.enqueue(
                                        encoder.encode(`data: ${JSON.stringify({ text: textChunk })}\n\n`)
                                    );
                                }
                            } catch {
                                // Ignore non-JSON lines or keep buffer
                            }
                        }
                    }
                } catch (streamErr) {
                    controller.error(streamErr);
                }
            },
            cancel() {
                reader.cancel();
            },
        });
    }
}
