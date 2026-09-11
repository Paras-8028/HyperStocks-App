import { ApiResult, RequestOptions } from '@/types/api';

export class ApiClient {
    private static defaultTimeout = 12000;

    public static async get<T>(
        url: string,
        options: RequestOptions = {}
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
