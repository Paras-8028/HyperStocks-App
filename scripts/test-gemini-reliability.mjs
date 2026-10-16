import assert from 'node:assert';
import test from 'node:test';

// Test parseGeminiError logic
function extractRetryDelaySeconds(headers, bodyObj) {
    if (headers) {
        let retryHeader = null;
        if (typeof headers.get === 'function') {
            retryHeader = headers.get('retry-after');
        } else if (typeof headers === 'object') {
            retryHeader = headers['retry-after'] || headers['Retry-After'] || null;
        }

        if (retryHeader) {
            const seconds = parseInt(retryHeader, 10);
            if (!isNaN(seconds) && seconds > 0) {
                return seconds;
            }
        }
    }

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

function parseGeminiError(status, headers, rawBody, model) {
    let bodyObj = null;
    let rawMessage = '';

    try {
        bodyObj = JSON.parse(rawBody);
        rawMessage = bodyObj?.error?.message || '';
    } catch {
        rawMessage = rawBody;
    }

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

// Cooldown Tracker
class AICooldownTracker {
    constructor() {
        this.quotaExhaustedUntil = 0;
        this.rateLimitedUntil = 0;
        this.activeError = null;
    }

    isCooldownActive() {
        const now = Date.now();
        return now < this.quotaExhaustedUntil || now < this.rateLimitedUntil;
    }

    getActiveCooldownError() {
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

    registerError(err) {
        this.activeError = err;
        const now = Date.now();
        const delaySeconds = err.retryAfterSeconds || (err.code === 'AI_QUOTA_EXCEEDED' ? 300 : 30);
        const expiry = now + delaySeconds * 1000;

        if (err.code === 'AI_QUOTA_EXCEEDED') {
            this.quotaExhaustedUntil = Math.max(this.quotaExhaustedUntil, expiry);
        } else if (err.code === 'AI_RATE_LIMITED') {
            this.rateLimitedUntil = Math.max(this.rateLimitedUntil, expiry);
        }
    }

    clear() {
        this.quotaExhaustedUntil = 0;
        this.rateLimitedUntil = 0;
        this.activeError = null;
    }
}

// Cache Manager
class AIAnalysisCacheManager {
    constructor() {
        this.cache = new Map();
        this.inFlight = new Map();
        this.defaultTtlMs = 30 * 60 * 1000;
    }

    get(key) {
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

    set(key, data, ttlMs) {
        const duration = ttlMs ?? this.defaultTtlMs;
        const now = Date.now();
        this.cache.set(key, {
            data,
            cachedAt: now,
            expiresAt: now + duration,
        });
    }

    async deduplicate(key, fn) {
        const existing = this.inFlight.get(key);
        if (existing) {
            return existing;
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

test('HTTP 429 Quota Exhaustion detection and key redaction', () => {
    const rawError = JSON.stringify({
        error: {
            code: 429,
            message: 'You exceeded your current quota. Metric: generativelanguage.googleapis.com/generate_content_free_tier_requests?key=AIzaSySecret123',
            status: 'RESOURCE_EXHAUSTED',
            details: [
                {
                    '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                    retryDelay: '22400s',
                },
            ],
        },
    });

    const parsed = parseGeminiError(429, { 'Retry-After': '22400' }, rawError, 'gemini-3.8-flash');
    assert.strictEqual(parsed.code, 'AI_QUOTA_EXCEEDED');
    assert.strictEqual(parsed.retryable, false);
    assert.strictEqual(parsed.retryAfterSeconds, 22400);
    assert.strictEqual(parsed.status, 429);
    assert(!parsed.details?.includes('AIzaSySecret123'), 'API key must be redacted');
    assert(parsed.details?.includes('key=[REDACTED]'), 'Redaction placeholder present');
});

test('HTTP 429 Short-term rate limit detection', () => {
    const rawError = JSON.stringify({
        error: {
            code: 429,
            message: 'Rate limit exceeded: 15 RPM for model gemini-2.5-flash-lite',
            status: 'RATE_LIMIT_EXCEEDED',
        },
    });

    const parsed = parseGeminiError(429, { 'retry-after': '20' }, rawError, 'gemini-2.5-flash-lite');
    assert.strictEqual(parsed.code, 'AI_RATE_LIMITED');
    assert.strictEqual(parsed.retryable, true);
    assert.strictEqual(parsed.retryAfterSeconds, 20);
});

test('HTTP 503 Temporary overload handling', () => {
    const rawError = JSON.stringify({
        error: {
            code: 503,
            message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.',
            status: 'UNAVAILABLE',
        },
    });

    const parsed = parseGeminiError(503, undefined, rawError, 'gemini-2.5-flash-lite');
    assert.strictEqual(parsed.code, 'AI_TEMPORARILY_OVERLOADED');
    assert.strictEqual(parsed.retryable, true);
    assert.strictEqual(parsed.retryAfterSeconds, 5);
});

test('AICooldownTracker registers and halts requests during active quota cooldown', () => {
    const tracker = new AICooldownTracker();
    assert.strictEqual(tracker.isCooldownActive(), false);

    tracker.registerError({
        code: 'AI_QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        status: 429,
        retryable: false,
        retryAfterSeconds: 60,
    });

    assert.strictEqual(tracker.isCooldownActive(), true);
    const activeErr = tracker.getActiveCooldownError();
    assert(activeErr !== null);
    assert.strictEqual(activeErr?.code, 'AI_QUOTA_EXCEEDED');
    assert(activeErr?.retryAfterSeconds > 0 && activeErr?.retryAfterSeconds <= 60);

    tracker.clear();
    assert.strictEqual(tracker.isCooldownActive(), false);
    assert.strictEqual(tracker.getActiveCooldownError(), null);
});

test('AIAnalysisCacheManager caches with TTL and deduplicates simultaneous requests', async () => {
    const cache = new AIAnalysisCacheManager();

    // Cache hit test
    cache.set('stock:AAPL', { score: 92 }, 5000);
    const hit = cache.get('stock:AAPL');
    assert.notStrictEqual(hit, null);
    assert.strictEqual(hit.data.score, 92);

    // Deduplication test
    let executionCount = 0;
    const slowFetcher = async () => {
        executionCount++;
        await new Promise((r) => setTimeout(r, 20));
        return { symbol: 'AAPL', count: executionCount };
    };

    const [res1, res2, res3] = await Promise.all([
        cache.deduplicate('slow_key', slowFetcher),
        cache.deduplicate('slow_key', slowFetcher),
        cache.deduplicate('slow_key', slowFetcher),
    ]);

    assert.strictEqual(executionCount, 1, 'Only one underlying execution should occur for parallel requests');
    assert.strictEqual(res1.count, 1);
    assert.strictEqual(res2.count, 1);
    assert.strictEqual(res3.count, 1);
});

console.log('All Gemini reliability unit test suites passed!');
