export interface StockQuote {
    symbol: string;
    currentPrice: number;
    change: number;
    percentChange: number;
    highPrice?: number;
    lowPrice?: number;
    openPrice?: number;
    previousClose?: number;
    volume?: number;
    timestamp?: number;
}

export interface CompanyProfile {
    symbol: string;
    name: string;
    exchange: string;
    currency?: string;
    country?: string;
    industry?: string;
    marketCap?: number;
    sharesOutstanding?: number;
    weburl?: string;
    logo?: string;
}

export interface FinancialMetrics {
    symbol: string;
    peRatio?: number;
    pbRatio?: number;
    dividendYield?: number;
    eps?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    beta?: number;
    revenuePerShare?: number;
}

export interface MarketSearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
    isInWatchlist?: boolean;
}

export interface MarketSectorPerformance {
    sector: string;
    changePercent: number;
    leadingStock?: string;
}

export type CandleResolution = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';

export interface StockCandlesResult {
    symbol: string;
    close: number[];
    high: number[];
    low: number[];
    open: number[];
    timestamps: number[];
    volume: number[];
    status: 'ok' | 'no_data';
}
