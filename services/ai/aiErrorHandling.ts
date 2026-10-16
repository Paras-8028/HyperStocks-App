import { AI_CONFIG } from '@/config/ai';

export type AIErrorCode =
    | 'AI_QUOTA_EXCEEDED'          // 429: free-tier or daily quota exhausted (non-retryable immediately)
    | 'AI_RATE_LIMITED'             // 429: short-term requests-per-minute/concurrency limit
    | 'AI_TEMPORARILY_OVERLOADED'   // 503: model experiencing high demand spikes
    | 'AI_AUTH_ERROR'               // 401/403: API key missing or invalid
    | 'AI_INVALID_REQUEST'          // 400: malformed request or prompt
    | 'AI_TIMEOUT'                  // timeout during generation
    | 'AI_SERVICE_ERROR';           // 500/502/504 or unhandled

export interface AIStructuredError {
    code: AIErrorCode;
    message: string;
    status: number;
    retryable: boolean;
    retryAfterSeconds?: number;
    model?: string;
    details?: string;
}

export interface AIStructuredResponse<T> {
    success: boolean;
    data?: T;
    error?: AIStructuredError;
    cached?: boolean;
    cachedAt?: string;
}

/**
 * Extracts retry delay in seconds from raw Google error body or headers.
 */
function extractRetryDelaySeconds(
    headers: Headers | Record<string, string> | undefined,
    bodyObj: any
): number | undefined {
    // 1. Check Retry-After header
    if (headers) {
        let retryHeader: string | null = null;
        if (typeof (headers as Headers).get === 'function') {
            retryHeader = (headers as Headers).get('retry-after');
        } else if (typeof headers === 'object') {
            retryHeader = (headers as Record<string, string>)['retry-after'] ||
                          (headers as Record<string, string>)['Retry-After'] || null;
        }

        if (retryHeader) {
            const seconds = parseInt(retryHeader, 10);
            if (!isNaN(seconds) && seconds > 0) {
                return seconds;
            }
        }
    }

    // 2. Check Google rpc.RetryInfo in error.details array
    const details = bodyObj?.error?.details;
    if (Array.isArray(details)) {
        for (const item of details) {
            if (item['@type']?.includes('RetryInfo') && item.retryDelay) {
                const str = String(item.retryDelay);
                const seconds = parseFloat(str.replace('s', ''));
                if (!isNaN(seconds) && seconds > 0) {
                    return Math.ceil(seconds);
                }
            }
        }
    }

    return undefined;
}

/**
 * Parses raw HTTP response status, headers, and body from Google Gemini API
 * into a sanitized, standardized AIStructuredError without leaking API keys.
 */
export function parseGeminiError(
    status: number,
    headers: Headers | Record<string, string> | undefined,
    rawBody: string,
    model?: string
): AIStructuredError {
    let bodyObj: any = null;
    let rawMessage = '';

    try {
        bodyObj = JSON.parse(rawBody);
        rawMessage = bodyObj?.error?.message || '';
    } catch {
        rawMessage = rawBody;
    }

    // Sanitize any accidental API key exposure in error string
    const sanitizedRaw = rawMessage.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
    const retrySeconds = extractRetryDelaySeconds(headers, bodyObj);

    if (status === 429) {
        const isQuotaExhausted =
            sanitizedRaw.toLowerCase().includes('quota') ||
            sanitizedRaw.toLowerCase().includes('free_tier') ||
            sanitizedRaw.toLowerCase().includes('resource_exhausted') ||
            bodyObj?.error?.status === 'RESOURCE_EXHAUSTED' ||
            (retrySeconds && retrySeconds > 300);

        if (isQuotaExhausted) {
            return {
                code: 'AI_QUOTA_EXCEEDED',
                message: 'AI analysis is temporarily unavailable because the API usage quota has been reached. Please check back later.',
                status: 429,
                retryable: false,
                retryAfterSeconds: retrySeconds || 300,
                model,
                details: sanitizedRaw,
            };
        }

        return {
            code: 'AI_RATE_LIMITED',
            message: 'Too many requests were sent to the AI service. Please wait a moment before trying again.',
            status: 429,
            retryable: true,
            retryAfterSeconds: retrySeconds || 30,
            model,
            details: sanitizedRaw,
        };
    }

    if (status === 503) {
        return {
            code: 'AI_TEMPORARILY_OVERLOADED',
            message: 'This AI model is currently experiencing high demand. Please try again shortly.',
            status: 503,
            retryable: true,
            retryAfterSeconds: retrySeconds || 5,
            model,
            details: sanitizedRaw,
        };
    }

    if (status === 401 || status === 403) {
        return {
            code: 'AI_AUTH_ERROR',
            message: 'AI service authentication failed. Please verify that your GEMINI_API_KEY is configured correctly.',
            status,
            retryable: false,
            model,
            details: sanitizedRaw,
        };
    }

    if (status === 400) {
        return {
            code: 'AI_INVALID_REQUEST',
            message: 'The AI request was malformed or exceeded context limits.',
            status: 400,
            retryable: false,
            model,
            details: sanitizedRaw,
        };
    }

    return {
        code: 'AI_SERVICE_ERROR',
        message: 'The AI service encountered a temporary error. Please try again shortly.',
        status: status || 500,
        retryable: status === 502 || status === 504,
        retryAfterSeconds: retrySeconds || 10,
        model,
        details: sanitizedRaw,
    };
}

/**
 * Server-side in-memory cooldown tracker.
 * Prevents redundant Gemini calls while quota or rate limits are actively exhausted.
 */
class AICooldownTracker {
    private quotaExhaustedUntil: number = 0;
    private rateLimitedUntil: number = 0;
    private activeError: AIStructuredError | null = null;

    public isCooldownActive(): boolean {
        const now = Date.now();
        return now < this.quotaExhaustedUntil || now < this.rateLimitedUntil;
    }

    public getActiveCooldownError(): AIStructuredError | null {
        if (!this.isCooldownActive() || !this.activeError) {
            return null;
        }

        const now = Date.now();
        const targetExpiry = Math.max(this.quotaExhaustedUntil, this.rateLimitedUntil);
        const remainingSeconds = Math.max(1, Math.ceil((targetExpiry - now) / 1000));

        return {
            ...this.activeError,
            retryAfterSeconds: remainingSeconds,
        };
    }

    public registerError(err: AIStructuredError): void {
        this.activeError = err;
        const now = Date.now();
        const delaySeconds =
            err.retryAfterSeconds ||
            (err.code === 'AI_QUOTA_EXCEEDED'
                ? AI_CONFIG.defaultQuotaCooldownSeconds
                : AI_CONFIG.defaultRateLimitCooldownSeconds);
        const expiry = now + delaySeconds * 1000;

        if (err.code === 'AI_QUOTA_EXCEEDED') {
            this.quotaExhaustedUntil = Math.max(this.quotaExhaustedUntil, expiry);
        } else if (err.code === 'AI_RATE_LIMITED') {
            this.rateLimitedUntil = Math.max(this.rateLimitedUntil, expiry);
        }
    }

    public clear(): void {
        this.quotaExhaustedUntil = 0;
        this.rateLimitedUntil = 0;
        this.activeError = null;
    }
}

export const aiCooldownTracker = new AICooldownTracker();

/**
 * Server-side analysis cache with TTL and in-flight request deduplication.
 */
interface CacheEntry<T> {
    data: T;
    cachedAt: number;
    expiresAt: number;
}

class AIAnalysisCacheManager {
    private cache = new Map<string, CacheEntry<any>>();
    private inFlight = new Map<string, Promise<any>>();
    private readonly defaultTtlMs = AI_CONFIG.stockAnalysisCacheTtlMs;

    public get<T>(key: string): { data: T; cachedAt: string } | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return {
            data: entry.data,
            cachedAt: new Date(entry.cachedAt).toISOString(),
        };
    }

    public set<T>(key: string, data: T, ttlMs?: number): void {
        const duration = ttlMs ?? this.defaultTtlMs;
        const now = Date.now();
        this.cache.set(key, {
            data,
            cachedAt: now,
            expiresAt: now + duration,
        });
    }

    public invalidate(key: string): void {
        this.cache.delete(key);
    }

    public async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
        const existing = this.inFlight.get(key);
        if (existing) {
            return existing as Promise<T>;
        }

        const promise = (async () => {
            try {
                return await fn();
            } finally {
                this.inFlight.delete(key);
            }
        })();

        this.inFlight.set(key, promise);
        return promise;
    }
}

export const aiAnalysisCache = new AIAnalysisCacheManager();
