import { ApiResult } from '@/types/api';
import {
    NewsArticleEntity,
    NewsIntelligenceOptions,
    NewsIntelligenceResponse,
} from '@/types/news';

export interface INewsService {
    getMarketNews(category?: string): Promise<ApiResult<NewsArticleEntity[]>>;
    getCompanyNews(symbol: string, daysBack?: number): Promise<ApiResult<NewsArticleEntity[]>>;
    getCuratedWatchlistNews(symbols: string[]): Promise<ApiResult<NewsArticleEntity[]>>;
    getNewsIntelligence(
        options?: NewsIntelligenceOptions
    ): Promise<ApiResult<NewsIntelligenceResponse>>;
}
