import { ApiResult } from '@/types/api';
import {
    CompanyProfile,
    FinancialMetrics,
    MarketSearchResult,
    StockQuote,
} from '@/types/market';

export interface IMarketDataProvider {
    getQuote(symbol: string): Promise<ApiResult<StockQuote>>;
    getCompanyProfile(symbol: string): Promise<ApiResult<CompanyProfile>>;
    getFinancialMetrics(symbol: string): Promise<ApiResult<FinancialMetrics>>;
    searchStocks(query?: string): Promise<ApiResult<MarketSearchResult[]>>;
    getMarketPeers(symbol: string): Promise<ApiResult<string[]>>;
}
