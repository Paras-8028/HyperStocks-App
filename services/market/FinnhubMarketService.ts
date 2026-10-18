import { ApiClient } from '@/services/api/apiClient';
import { IMarketDataProvider } from './IMarketDataProvider';
import { ApiFailure, ApiResult } from '@/types/api';
import {
    CompanyProfile,
    FinancialMetrics,
    MarketSearchResult,
    StockQuote,
    CandleResolution,
    StockCandlesResult,
} from '@/types/market';
import { MARKET_CONFIG } from '@/config/market';
import { POPULAR_STOCK_SYMBOLS } from '@/lib/constants';

export class FinnhubMarketService implements IMarketDataProvider {
    private readonly baseUrl = 'https://finnhub.io/api/v1';
    private readonly token: string;
    private static candleCache = new Map<string, { expiresAt: number; data: StockCandlesResult }>();
    private static candleEndpointUnavailableUntil = 0;

    /**
     * Resets the candle circuit breaker (useful in test suites).
     */
    public static resetCandleEndpointStatus(): void {
        this.candleEndpointUnavailableUntil = 0;
        this.candleCache.clear();
    }

    /**
     * Checks if the candle endpoint is currently known to be available on the configured tier.
     */
    public static isCandleEndpointAvailable(): boolean {
        return Date.now() >= this.candleEndpointUnavailableUntil;
    }

    /**
     * Trips the candle circuit breaker for a given duration (defaults to 1 hour).
     */
    public static tripCandleCircuitBreaker(durationMs: number = 60 * 60 * 1000): void {
        this.candleEndpointUnavailableUntil = Date.now() + durationMs;
    }

    constructor(token?: string) {
        this.token =
            token ||
            process.env.FINNHUB_API_KEY ||
            process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
            '';
    }

    private ensureToken(): ApiFailure | null {
        if (!this.token) {
            return {
                success: false,
                error: 'Finnhub API key is not configured',
                code: 'MISSING_API_KEY',
            };
        }
        return null;
    }

    async getQuote(symbol: string): Promise<ApiResult<StockQuote>> {
        const tokenErr = this.ensureToken();
        if (tokenErr) return tokenErr;

        const cleanSymbol = symbol.trim().toUpperCase();
        const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(cleanSymbol)}&token=${this.token}`;

        const res = await ApiClient.get<{
            c: number;
            d: number;
            dp: number;
            h?: number;
            l?: number;
            o?: number;
            pc?: number;
            t?: number;
        }>(url, { revalidateSeconds: MARKET_CONFIG.cacheTTL.quoteSeconds });

        if (!res.success) return res;

        return {
            success: true,
            data: {
                symbol: cleanSymbol,
                currentPrice: res.data.c ?? 0,
                change: res.data.d ?? 0,
                percentChange: res.data.dp ?? 0,
                highPrice: res.data.h,
                lowPrice: res.data.l,
                openPrice: res.data.o,
                previousClose: res.data.pc,
                timestamp: res.data.t ? res.data.t * 1000 : Date.now(),
            },
        };
    }

    async getCompanyProfile(symbol: string): Promise<ApiResult<CompanyProfile>> {
        const tokenErr = this.ensureToken();
        if (tokenErr) return tokenErr;

        const cleanSymbol = symbol.trim().toUpperCase();
        const url = `${this.baseUrl}/stock/profile2?symbol=${encodeURIComponent(cleanSymbol)}&token=${this.token}`;

        const res = await ApiClient.get<any>(url, {
            revalidateSeconds: MARKET_CONFIG.cacheTTL.profileSeconds,
        });

        if (!res.success) return res;

        const d = res.data || {};
        return {
            success: true,
            data: {
                symbol: cleanSymbol,
                name: d.name || cleanSymbol,
                exchange: d.exchange || 'US',
                currency: d.currency || 'USD',
                country: d.country,
                industry: d.finnhubIndustry,
                marketCap: d.marketCapitalization,
                sharesOutstanding: d.shareOutstanding,
                weburl: d.weburl,
                logo: d.logo,
            },
        };
    }

    async getFinancialMetrics(symbol: string): Promise<ApiResult<FinancialMetrics>> {
        const tokenErr = this.ensureToken();
        if (tokenErr) return tokenErr;

        const cleanSymbol = symbol.trim().toUpperCase();
        const url = `${this.baseUrl}/stock/metric?symbol=${encodeURIComponent(cleanSymbol)}&metric=all&token=${this.token}`;

        const res = await ApiClient.get<any>(url, {
            revalidateSeconds: MARKET_CONFIG.cacheTTL.financialsSeconds,
        });

        if (!res.success) return res;

        const m = res.data?.metric || {};
        return {
            success: true,
            data: {
                symbol: cleanSymbol,
                peRatio: m['peNormalizedAnnual'] || m['peBasicExclExtraTTM'],
                pbRatio: m['pbAnnual'],
                dividendYield: m['dividendYieldIndicatedAnnual'],
                eps: m['epsNormalizedAnnual'],
                fiftyTwoWeekHigh: m['52WeekHigh'],
                fiftyTwoWeekLow: m['52WeekLow'],
                beta: m['beta'],
                revenuePerShare: m['revenuePerShareTTM'],
            },
        };
    }

    async searchStocks(query?: string): Promise<ApiResult<MarketSearchResult[]>> {
        const tokenErr = this.ensureToken();
        if (tokenErr) return tokenErr;

        const trimmed = (query || '').trim();

        if (!trimmed) {
            // Default to popular symbols
            const top = POPULAR_STOCK_SYMBOLS.slice(0, 10);
            const profiles = await Promise.all(
                top.map(async (sym) => {
                    const prof = await this.getCompanyProfile(sym);
                    return {
                        symbol: sym,
                        name: prof.success ? prof.data.name : sym,
                        exchange: prof.success ? prof.data.exchange : 'US',
                        type: 'Common Stock',
                    };
                })
            );

            return {
                success: true,
                data: profiles,
            };
        }

        const url = `${this.baseUrl}/search?q=${encodeURIComponent(trimmed)}&token=${this.token}`;
        const res = await ApiClient.get<{
            result: Array<{
                description: string;
                displaySymbol: string;
                symbol: string;
                type: string;
            }>;
        }>(url, { revalidateSeconds: MARKET_CONFIG.cacheTTL.searchSeconds });

        if (!res.success) return res;

        const list = (res.data?.result || []).slice(0, 15).map((r) => ({
            symbol: (r.symbol || '').toUpperCase(),
            name: r.description || r.symbol,
            exchange: r.displaySymbol?.includes(':') ? r.displaySymbol.split(':')[0] : 'US',
            type: r.type || 'Common Stock',
        }));

        return {
            success: true,
            data: list,
        };
    }

    async getMarketPeers(symbol: string): Promise<ApiResult<string[]>> {
        const tokenErr = this.ensureToken();
        if (tokenErr) return tokenErr;

        const cleanSymbol = symbol.trim().toUpperCase();
        const url = `${this.baseUrl}/stock/peers?symbol=${encodeURIComponent(cleanSymbol)}&token=${this.token}`;

        const res = await ApiClient.get<string[]>(url, {
            revalidateSeconds: MARKET_CONFIG.cacheTTL.profileSeconds,
        });

        if (!res.success) return res;
        return {
            success: true,
            data: (res.data || []).filter((s) => s && s !== cleanSymbol),
        };
    }

    /**
     * Retrieves historical stock candle data from Finnhub.
     * Validates input parameters, checks for empty / no_data conditions,
     * and filters out zero/corrupted price records.
     */
    async getCandles(
        symbol: string,
        resolution: CandleResolution = 'D',
        from: number,
        to: number
    ): Promise<ApiResult<StockCandlesResult>> {
        const tokenErr = this.ensureToken();
        if (tokenErr) return tokenErr;

        const cleanSymbol = symbol.trim().toUpperCase();
        if (!cleanSymbol) {
            return {
                success: false,
                error: 'Symbol is required',
                code: 'INVALID_SYMBOL',
            };
        }

        if (typeof from !== 'number' || typeof to !== 'number' || isNaN(from) || isNaN(to) || from >= to) {
            return {
                success: false,
                error: `Invalid time range: 'from' (${from}) must be strictly less than 'to' (${to})`,
                code: 'INVALID_TIME_RANGE',
            };
        }

        const validResolutions = new Set(['1', '5', '15', '30', '60', 'D', 'W', 'M']);
        if (!validResolutions.has(resolution)) {
            return {
                success: false,
                error: `Unsupported resolution '${resolution}'. Supported: 1, 5, 15, 30, 60, D, W, M`,
                code: 'INVALID_RESOLUTION',
            };
        }

        if (!FinnhubMarketService.isCandleEndpointAvailable()) {
            return {
                success: false,
                error: 'Finnhub historical candle endpoint (/stock/candle) is unavailable on the current free-tier account (HTTP 403 Forbidden). System operates honestly on live quotes and verified data.',
                code: 403,
            };
        }

        const cacheKey = `${cleanSymbol}:${resolution}:${Math.floor(from)}:${Math.floor(to)}`;
        const cached = FinnhubMarketService.candleCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            return {
                success: true,
                data: cached.data,
            };
        }

        const url = `${this.baseUrl}/stock/candle?symbol=${encodeURIComponent(cleanSymbol)}&resolution=${encodeURIComponent(resolution)}&from=${Math.floor(from)}&to=${Math.floor(to)}&token=${this.token}`;

        const res = await ApiClient.get<{
            c?: number[];
            h?: number[];
            l?: number[];
            o?: number[];
            s: string;
            t?: number[];
            v?: number[];
        }>(url, { revalidateSeconds: 300 });

        if (!res.success) {
            if (res.code === 403) {
                FinnhubMarketService.candleEndpointUnavailableUntil = Date.now() + 60 * 60 * 1000;
            }
            return res;
        }

        const raw = res.data;
        if (!raw || raw.s === 'no_data' || !Array.isArray(raw.c) || raw.c.length === 0) {
            return {
                success: true,
                data: {
                    symbol: cleanSymbol,
                    close: [],
                    high: [],
                    low: [],
                    open: [],
                    timestamps: [],
                    volume: [],
                    status: 'no_data',
                },
            };
        }

        // Filter valid observations where prices are positive real numbers
        const validIndices: number[] = [];
        for (let i = 0; i < raw.c.length; i++) {
            const close = raw.c[i];
            const ts = raw.t?.[i];
            if (typeof close === 'number' && !isNaN(close) && close > 0 && typeof ts === 'number') {
                validIndices.push(i);
            }
        }

        if (validIndices.length === 0) {
            return {
                success: true,
                data: {
                    symbol: cleanSymbol,
                    close: [],
                    high: [],
                    low: [],
                    open: [],
                    timestamps: [],
                    volume: [],
                    status: 'no_data',
                },
            };
        }

        const resultData: StockCandlesResult = {
            symbol: cleanSymbol,
            close: validIndices.map((i) => raw.c![i]),
            high: validIndices.map((i) => raw.h?.[i] ?? raw.c![i]),
            low: validIndices.map((i) => raw.l?.[i] ?? raw.c![i]),
            open: validIndices.map((i) => raw.o?.[i] ?? raw.c![i]),
            timestamps: validIndices.map((i) => raw.t![i]),
            volume: validIndices.map((i) => raw.v?.[i] ?? 0),
            status: 'ok',
        };

        FinnhubMarketService.candleCache.set(cacheKey, {
            expiresAt: Date.now() + 300_000,
            data: resultData,
        });

        return {
            success: true,
            data: resultData,
        };
    }
}
