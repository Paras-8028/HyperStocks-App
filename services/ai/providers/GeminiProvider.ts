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

        const candidateModels = Array.from(
            new Set([
                AI_CONFIG.defaultModel,
                AI_CONFIG.fallbackModel,
                ...(AI_CONFIG.candidateModels || []),
            ])
        );

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

        let lastStatus = 500;
        let lastErrorText = '';

        for (const model of candidateModels) {
            const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    cache: 'no-store',
                });

                if (!res.ok) {
                    lastStatus = res.status;
                    const errRaw = await res.text().catch(() => '');
                    lastErrorText = errRaw;
                    try {
                        const parsed = JSON.parse(errRaw);
                        if (parsed?.error?.message) {
                            lastErrorText = parsed.error.message;
                        }
                    } catch {}

                    console.warn(`[GeminiProvider] Model ${model} returned HTTP ${res.status}. Trying next candidate model...`);
                    continue;
                }

                const data = await res.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) {
                    console.warn(`[GeminiProvider] Model ${model} returned empty candidates. Trying next candidate model...`);
                    continue;
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
                console.warn(`[GeminiProvider] Model ${model} fetch exception:`, err?.message);
                lastErrorText = err?.message || 'Network error';
                continue;
            }
        }

        return {
            success: false,
            error: `Gemini API error (${lastStatus}): ${lastErrorText || 'All models exceeded quota or experienced high demand'}`,
            code: lastStatus,
        };
    }

    async generateStream(req: AIProviderRequest): Promise<ReadableStream<Uint8Array>> {
        if (!this.isAvailable) {
            throw new Error('GEMINI_API_KEY environment variable is not configured');
        }

        const candidateModels = Array.from(
            new Set([
                AI_CONFIG.defaultModel,
                AI_CONFIG.fallbackModel,
                ...(AI_CONFIG.candidateModels || []),
            ])
        );

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

        let res: Response | null = null;
        let lastError = '';

        for (const model of candidateModels) {
            const url = `${this.baseUrl}/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    cache: 'no-store',
                });

                if (response.ok && response.body) {
                    res = response;
                    break;
                } else {
                    lastError = await response.text().catch(() => '');
                }
            } catch (err: any) {
                lastError = err?.message || 'Stream error';
            }
        }

        if (!res || !res.ok) {
            throw new Error(`Gemini Stream Error: ${lastError || 'All models exhausted'}`);
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
