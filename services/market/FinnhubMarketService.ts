import { ApiClient } from '@/services/api/apiClient';
import { IMarketDataProvider } from './IMarketDataProvider';
import { ApiResult } from '@/types/api';
import {
    CompanyProfile,
    FinancialMetrics,
    MarketSearchResult,
    StockQuote,
} from '@/types/market';
import { MARKET_CONFIG } from '@/config/market';
import { POPULAR_STOCK_SYMBOLS } from '@/lib/constants';

export class FinnhubMarketService implements IMarketDataProvider {
    private readonly baseUrl = 'https://finnhub.io/api/v1';
    private readonly token: string;

    constructor(token?: string) {
        this.token =
            token ||
            process.env.FINNHUB_API_KEY ||
            process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
            '';
    }

    private ensureToken(): ApiResult<string> | null {
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
}
