import { ApiClient } from '@/services/api/apiClient';
import { INewsService } from './INewsService';
import { ApiResult } from '@/types/api';
import { NewsArticleEntity } from '@/types/news';
import { getDateRange, validateArticle } from '@/lib/utils';
import { MARKET_CONFIG } from '@/config/market';

export class FinnhubNewsService implements INewsService {
    private readonly baseUrl = 'https://finnhub.io/api/v1';
    private readonly token: string;

    constructor(token?: string) {
        this.token =
            token ||
            process.env.FINNHUB_API_KEY ||
            process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
            '';
    }

    async getMarketNews(category = 'general'): Promise<ApiResult<NewsArticleEntity[]>> {
        if (!this.token) {
            return {
                success: false,
                error: 'Finnhub API key is not configured',
                code: 'MISSING_API_KEY',
            };
        }

        const url = `${this.baseUrl}/news?category=${encodeURIComponent(category)}&token=${this.token}`;
        const res = await ApiClient.get<any[]>(url, {
            revalidateSeconds: MARKET_CONFIG.cacheTTL.newsSeconds,
        });

        if (!res.success) return res;

        const articles = (res.data || [])
            .filter(validateArticle)
            .slice(0, MARKET_CONFIG.limits.maxNewsPerQuery)
            .map((a, index) => ({
                id: a.id || `market-${index}`,
                headline: a.headline,
                summary: a.summary || '',
                source: a.source || 'Financial News',
                url: a.url || '#',
                datetime: (a.datetime || 0) * 1000,
                category: a.category || category,
                image: a.image,
            }));

        return {
            success: true,
            data: articles,
        };
    }

    async getCompanyNews(
        symbol: string,
        daysBack = 7
    ): Promise<ApiResult<NewsArticleEntity[]>> {
        if (!this.token) {
            return {
                success: false,
                error: 'Finnhub API key is not configured',
                code: 'MISSING_API_KEY',
            };
        }

        const cleanSymbol = symbol.trim().toUpperCase();
        const range = getDateRange(daysBack);
        const url = `${this.baseUrl}/company-news?symbol=${encodeURIComponent(cleanSymbol)}&from=${range.from}&to=${range.to}&token=${this.token}`;

        const res = await ApiClient.get<any[]>(url, {
            revalidateSeconds: MARKET_CONFIG.cacheTTL.newsSeconds,
        });

        if (!res.success) return res;

        const articles = (res.data || [])
            .filter(validateArticle)
            .slice(0, MARKET_CONFIG.limits.maxNewsPerQuery)
            .map((a, index) => ({
                id: a.id || `${cleanSymbol}-${index}`,
                headline: a.headline,
                summary: a.summary || '',
                source: a.source || 'Company News',
                url: a.url || '#',
                datetime: (a.datetime || 0) * 1000,
                category: 'company',
                relatedSymbol: cleanSymbol,
                image: a.image,
            }));

        return {
            success: true,
            data: articles,
        };
    }

    async getCuratedWatchlistNews(
        symbols: string[]
    ): Promise<ApiResult<NewsArticleEntity[]>> {
        if (!symbols || symbols.length === 0) {
            return this.getMarketNews('general');
        }

        const cleanSymbols = symbols.map((s) => s.trim().toUpperCase()).slice(0, 5);

        const results = await Promise.all(
            cleanSymbols.map((sym) => this.getCompanyNews(sym, 5))
        );

        const merged: NewsArticleEntity[] = [];
        const seen = new Set<string>();

        for (const res of results) {
            if (res.success && res.data) {
                for (const art of res.data) {
                    if (!seen.has(art.headline)) {
                        seen.add(art.headline);
                        merged.push(art);
                    }
                }
            }
        }

        if (merged.length === 0) {
            return this.getMarketNews('general');
        }

        merged.sort((a, b) => b.datetime - a.datetime);

        return {
            success: true,
            data: merged.slice(0, 10),
        };
    }
}
