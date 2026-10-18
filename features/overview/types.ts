import { NewsArticleEntity } from '@/types/news';

export interface MarketIndexItem {
    name: string;
    symbol: string;
    displaySymbol: string;
    price: number;
    change: number;
    percentChange: number;
    sparkline: number[];
}

export interface HeatmapStockItem {
    symbol: string;
    name: string;
    sector: string;
    price: number;
    change: number;
    percentChange: number;
    marketCap: number; // in Millions USD
    weight: number; // 1 to 3 visual scale
}

export interface MajorQuoteItem {
    name: string;
    symbol: string;
    price: number;
    change: number;
    percentChange: number;
    highPrice?: number;
    lowPrice?: number;
    openPrice?: number;
    previousClose?: number;
    volume?: string;
    marketStatus?: string;
}

export interface SectorIndexItem {
    name: string;
    symbol: string;
    etfName: string;
    price: number;
    change: number;
    percentChange: number;
    performanceRank?: number;
}

export interface MarketStatusInfo {
    isOpen: boolean;
    sessionName: 'Regular Trading' | 'Pre-Market' | 'After-Hours' | 'Weekend / Closed';
    exchange: string;
    formattedTime: string;
    nextEvent: string;
}

export interface MarketOverviewPayload {
    indices: MarketIndexItem[];
    heatmap: HeatmapStockItem[];
    majorQuotes: MajorQuoteItem[];
    sectors: SectorIndexItem[];
    topStories: NewsArticleEntity[];
    marketStatus: MarketStatusInfo;
    lastUpdated: number;
    isFallbackData?: boolean;
}
