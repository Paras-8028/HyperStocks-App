import { ApiResult, RequestOptions } from '@/types/api';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

interface CircuitBreakerEntry {
    openUntil: number;
    status: number;
    reason: string;
}

export class ApiClient {
    private static defaultTimeout = 12000;

    // In-memory TTL cache for GET requests
    private static memoryCache = new Map<string, CacheEntry<any>>();

    // In-flight request deduplication map (promise coalescing)
    private static inFlightRequests = new Map<string, Promise<ApiResult<any>>>();

    // Circuit breakers for endpoints that return 403 or persistent 429
    private static circuitBreakers = new Map<string, CircuitBreakerEntry>();

    /**
     * Strips sensitive API tokens and keys from URLs for safe logging and error reporting.
     */
    public static sanitizeUrl(url: string): string {
        return url.replace(/([?&](?:token|key|api_key|apiKey)=)[^&]+/gi, '$1[REDACTED]');
    }

    /**
     * Extracts the base path without query parameters for circuit breaker scoping.
     */
    private static getEndpointBasePath(url: string): string {
        try {
            return url.split('?')[0];
        } catch {
            return url;
        }
    }

    /**
     * Clears all in-memory caches and in-flight tracking (useful in tests).
     */
    public static clearCache(): void {
        this.memoryCache.clear();
        this.inFlightRequests.clear();
        this.circuitBreakers.clear();
    }

    /**
     * Manually resets circuit breakers.
     */
    public static resetCircuitBreakers(): void {
        this.circuitBreakers.clear();
    }

    /**
     * Returns true if the circuit breaker is currently open for the given endpoint base URL.
     */
    public static isCircuitBreakerOpen(endpointBasePath: string): boolean {
        const breaker = this.circuitBreakers.get(endpointBasePath);
        if (!breaker) return false;
        if (Date.now() < breaker.openUntil) {
            return true;
        }
        this.circuitBreakers.delete(endpointBasePath);
        return false;
    }

    /**
     * Registers a circuit breaker for an endpoint that is permanently forbidden or rate limited.
     */
    public static tripCircuitBreaker(endpointBasePath: string, status: number, durationMs: number, reason: string): void {
        this.circuitBreakers.set(endpointBasePath, {
            openUntil: Date.now() + durationMs,
            status,
            reason,
        });
    }

    public static async get<T>(
        url: string,
        options: RequestOptions = {}
    ): Promise<ApiResult<T>> {
        const basePath = this.getEndpointBasePath(url);
        const cacheKey = url;
        const now = Date.now();

        // 1. Check Circuit Breaker (e.g. 403 on free tier or 429 cooldown)
        if (this.isCircuitBreakerOpen(basePath)) {
            const breaker = this.circuitBreakers.get(basePath);
            return {
                success: false,
                error: `Endpoint circuit breaker active: ${breaker?.reason || 'temporarily blocked'}`,
                code: breaker?.status || 403,
            };
        }

        // 2. Check in-memory cache
        if (options.revalidateSeconds && options.revalidateSeconds > 0) {
            const cached = this.memoryCache.get(cacheKey);
            if (cached && now < cached.expiresAt) {
                return {
                    success: true,
                    data: cached.data as T,
                };
            }
        }

        // 3. Deduplicate simultaneous in-flight requests (coalescing)
        if (this.inFlightRequests.has(cacheKey)) {
            return this.inFlightRequests.get(cacheKey)! as Promise<ApiResult<T>>;
        }

        const requestPromise = this.executeGetWithRetry<T>(url, options);
        this.inFlightRequests.set(cacheKey, requestPromise);

        try {
            const res = await requestPromise;

            // Cache successful GET responses in memory
            if (res.success && options.revalidateSeconds && options.revalidateSeconds > 0) {
                this.memoryCache.set(cacheKey, {
                    data: res.data,
                    expiresAt: now + options.revalidateSeconds * 1000,
                });
            }

            return res;
        } finally {
            this.inFlightRequests.delete(cacheKey);
        }
    }

    private static async executeGetWithRetry<T>(
        url: string,
        options: RequestOptions,
        attempt = 0
    ): Promise<ApiResult<T>> {
        const controller = new AbortController();
        const timeoutMs = options.timeoutMs ?? this.defaultTimeout;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {}),
                },
                ...(options.revalidateSeconds
                    ? { cache: 'force-cache', next: { revalidate: options.revalidateSeconds } }
                    : { cache: 'no-store' }),
            };

            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const basePath = this.getEndpointBasePath(url);

                // Handle HTTP 403 Forbidden: Account tier lacks access (e.g. Finnhub /stock/candle on free tier)
                if (response.status === 403) {
                    this.tripCircuitBreaker(
                        basePath,
                        403,
                        60 * 60 * 1000, // 1 hour circuit breaker
                        'Endpoint not permitted on current account tier (HTTP 403 Forbidden)'
                    );
                }

                // Handle HTTP 429 Too Many Requests: Rate limit exceeded
                if (response.status === 429) {
                    const maxRetries = options.retries ?? 0;
                    if (attempt < maxRetries) {
                        const retryAfterHeader = response.headers?.get ? response.headers.get('retry-after') : null;
                        const backoffSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) || 1 : 1;
                        const delayMs = backoffSeconds * 1000 + Math.floor(Math.random() * 300);
                        await new Promise((resolve) => setTimeout(resolve, delayMs));
                        return this.executeGetWithRetry<T>(url, options, attempt + 1);
                    }

                    // Trip short circuit breaker only if retries were attempted and failed
                    if (attempt > 0) {
                        this.tripCircuitBreaker(
                            basePath,
                            429,
                            15 * 1000,
                            'Provider rate limit reached (HTTP 429)'
                        );
                    }
                }

                const errorBody = await response.text().catch(() => '');
                return {
                    success: false,
                    error: `API error ${response.status}: ${errorBody || response.statusText}`,
                    code: response.status,
                };
            }

            const data = (await response.json()) as T;
            return {
                success: true,
                data,
            };
        } catch (err: any) {
            clearTimeout(timeoutId);
            const isAbort = err?.name === 'AbortError';
            return {
                success: false,
                error: isAbort ? `Request timeout after ${timeoutMs}ms` : (err?.message || 'Network request failed'),
                code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
            };
        }
    }

    public static async post<T, B = unknown>(
        url: string,
        body: B,
        options: RequestOptions = {}
    ): Promise<ApiResult<T>> {
        const controller = new AbortController();
        const timeoutMs = options.timeoutMs ?? this.defaultTimeout;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {}),
                },
                body: JSON.stringify(body),
                cache: 'no-store',
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.text().catch(() => '');
                return {
                    success: false,
                    error: `API error ${response.status}: ${errorBody || response.statusText}`,
                    code: response.status,
                };
            }

            const data = (await response.json()) as T;
            return {
                success: true,
                data,
            };
        } catch (err: any) {
            clearTimeout(timeoutId);
            const isAbort = err?.name === 'AbortError';
            return {
                success: false,
                error: isAbort ? `Request timeout after ${timeoutMs}ms` : (err?.message || 'Network request failed'),
                code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
            };
        }
    }
}
