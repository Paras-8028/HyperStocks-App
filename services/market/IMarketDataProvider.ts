import { ApiResult } from '@/types/api';
import {
    CompanyProfile,
    FinancialMetrics,
    MarketSearchResult,
    StockQuote,
    StockCandlesResult,
    CandleResolution,
} from '@/types/market';

export interface IMarketDataProvider {
    getQuote(symbol: string): Promise<ApiResult<StockQuote>>;
    getCompanyProfile(symbol: string): Promise<ApiResult<CompanyProfile>>;
    getFinancialMetrics(symbol: string): Promise<ApiResult<FinancialMetrics>>;
    searchStocks(query?: string): Promise<ApiResult<MarketSearchResult[]>>;
    getMarketPeers(symbol: string): Promise<ApiResult<string[]>>;
    getCandles(
        symbol: string,
        resolution: CandleResolution,
        from: number,
        to: number
    ): Promise<ApiResult<StockCandlesResult>>;
}

