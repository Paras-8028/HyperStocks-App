import { IAIProvider, AIProviderRequest, AIProviderResponse } from './IAIProvider';
import { ApiResult } from '@/types/api';
import { AI_CONFIG } from '@/config/ai';
import {
    AIStructuredError,
    aiCooldownTracker,
    parseGeminiError,
} from '@/services/ai/aiErrorHandling';

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoffDelay(attempt: number, serverRetryAfterSeconds?: number): number {
    if (serverRetryAfterSeconds && serverRetryAfterSeconds > 0) {
        return serverRetryAfterSeconds * 1000;
    }
    const baseDelay = AI_CONFIG.transientRetryDelayMs;
    const exponential = baseDelay * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 500);
    return exponential + jitter;
}

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
        // 1. Check if server is currently in active cooldown (e.g. quota exhausted or rate limit)
        const cooldownError = aiCooldownTracker.getActiveCooldownError();
        if (cooldownError) {
            return {
                success: false,
                error: cooldownError.message,
                code: cooldownError.status,
                structuredError: cooldownError,
            };
        }

        if (!this.isAvailable) {
            const authError: AIStructuredError = {
                code: 'AI_AUTH_ERROR',
                message: 'GEMINI_API_KEY environment variable is not configured',
                status: 401,
                retryable: false,
            };
            return {
                success: false,
                error: authError.message,
                code: 401,
                structuredError: authError,
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

        let lastStructuredError: AIStructuredError | null = null;

        for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
            const model = candidateModels[mIdx];
            const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

            // Transient 503 retry loop with exponential backoff & jitter
            const maxAttempts = 1 + AI_CONFIG.maxTransientRetries;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        cache: 'no-store',
                    });

                    if (!res.ok) {
                        const rawBody = await res.text().catch(() => '');
                        const parsedError = parseGeminiError(res.status, res.headers, rawBody, model);
                        lastStructuredError = parsedError;

                        // 429 Quota Exhaustion: Stop immediately, do NOT retry or burn other models
                        if (parsedError.code === 'AI_QUOTA_EXCEEDED') {
                            console.warn(`[GeminiProvider] Quota exceeded on metric. Registering cooldown of ${parsedError.retryAfterSeconds}s.`);
                            aiCooldownTracker.registerError(parsedError);
                            return {
                                success: false,
                                error: parsedError.message,
                                code: parsedError.status,
                                structuredError: parsedError,
                            };
                        }

                        // 429 Short-term rate limit: Register cooldown and return
                        if (parsedError.code === 'AI_RATE_LIMITED') {
                            console.warn(`[GeminiProvider] Short-term rate limit reached. Cooldown: ${parsedError.retryAfterSeconds}s.`);
                            aiCooldownTracker.registerError(parsedError);
                            return {
                                success: false,
                                error: parsedError.message,
                                code: parsedError.status,
                                structuredError: parsedError,
                            };
                        }

                        // 401/403 Auth error: Stop immediately
                        if (parsedError.code === 'AI_AUTH_ERROR') {
                            console.error('[GeminiProvider] Authentication failure. Halting requests.');
                            return {
                                success: false,
                                error: parsedError.message,
                                code: parsedError.status,
                                structuredError: parsedError,
                            };
                        }

                        // 503 Temporary Overload: Backoff retry on the current model
                        if (parsedError.code === 'AI_TEMPORARILY_OVERLOADED' && attempt < maxAttempts - 1) {
                            const delayMs = calculateBackoffDelay(attempt, parsedError.retryAfterSeconds);
                            console.warn(`[GeminiProvider] Model ${model} is experiencing high demand (503). Retrying attempt ${attempt + 1}/${AI_CONFIG.maxTransientRetries} in ${delayMs}ms...`);
                            await sleep(delayMs);
                            continue;
                        }

                        // If not 503, or 503 attempts exhausted on this model, break retry loop to try next model
                        break;
                    }

                    const data = await res.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (!text) {
                        console.warn(`[GeminiProvider] Model ${model} returned empty candidates.`);
                        break;
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
                    const parsedError = parseGeminiError(0, undefined, err?.message || 'Network error', model);
                    lastStructuredError = parsedError;
                    console.warn(`[GeminiProvider] Network failure on ${model}:`, parsedError.message);
                    break;
                }
            }
        }

        const finalError = lastStructuredError || {
            code: 'AI_SERVICE_ERROR',
            message: 'All Gemini candidate models experienced temporary errors. Please try again shortly.',
            status: 503,
            retryable: true,
            retryAfterSeconds: 15,
        };

        return {
            success: false,
            error: finalError.message,
            code: finalError.status,
            structuredError: finalError,
        };
    }

    async generateStream(req: AIProviderRequest): Promise<ReadableStream<Uint8Array>> {
        // 1. Check if server is currently in active cooldown
        const cooldownError = aiCooldownTracker.getActiveCooldownError();
        if (cooldownError) {
            const err = new Error(cooldownError.message);
            (err as any).structuredError = cooldownError;
            (err as any).status = cooldownError.status;
            throw err;
        }

        if (!this.isAvailable) {
            const authError: AIStructuredError = {
                code: 'AI_AUTH_ERROR',
                message: 'GEMINI_API_KEY environment variable is not configured',
                status: 401,
                retryable: false,
            };
            const err = new Error(authError.message);
            (err as any).structuredError = authError;
            (err as any).status = 401;
            throw err;
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
        let lastStructuredError: AIStructuredError | null = null;

        for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
            const model = candidateModels[mIdx];
            const url = `${this.baseUrl}/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

            const maxAttempts = 1 + AI_CONFIG.maxTransientRetries;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
                    }

                    const rawBody = await response.text().catch(() => '');
                    const parsedError = parseGeminiError(response.status, response.headers, rawBody, model);
                    lastStructuredError = parsedError;

                    if (parsedError.code === 'AI_QUOTA_EXCEEDED' || parsedError.code === 'AI_RATE_LIMITED') {
                        aiCooldownTracker.registerError(parsedError);
                        const err = new Error(parsedError.message);
                        (err as any).structuredError = parsedError;
                        (err as any).status = parsedError.status;
                        throw err;
                    }

                    if (parsedError.code === 'AI_AUTH_ERROR') {
                        const err = new Error(parsedError.message);
                        (err as any).structuredError = parsedError;
                        (err as any).status = parsedError.status;
                        throw err;
                    }

                    if (parsedError.code === 'AI_TEMPORARILY_OVERLOADED' && attempt < maxAttempts - 1) {
                        const delayMs = calculateBackoffDelay(attempt, parsedError.retryAfterSeconds);
                        console.warn(`[GeminiProvider Stream] Model ${model} returned 503. Retrying in ${delayMs}ms...`);
                        await sleep(delayMs);
                        continue;
                    }

                    break;
                } catch (fetchErr: any) {
                    if (fetchErr?.structuredError) {
                        throw fetchErr;
                    }
                    const parsedError = parseGeminiError(0, undefined, fetchErr?.message || 'Stream fetch error', model);
                    lastStructuredError = parsedError;
                    break;
                }
            }

            if (res && res.ok && res.body) {
                break;
            }
        }

        if (!res || !res.ok || !res.body) {
            const finalErr = lastStructuredError || {
                code: 'AI_SERVICE_ERROR',
                message: 'Failed to establish Gemini stream',
                status: 503,
                retryable: true,
                retryAfterSeconds: 15,
            };
            const err = new Error(finalErr.message);
            (err as any).structuredError = finalErr;
            (err as any).status = finalErr.status;
            throw err;
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = res.body.getReader();

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
                                    controller.enqueue(
                                        encoder.encode(`data: ${JSON.stringify({ text: textChunk })}\n\n`)
                                    );
                                }
                            } catch {
                                // Ignore unparseable lines
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
