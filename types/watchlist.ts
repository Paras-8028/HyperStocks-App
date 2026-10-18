import { StockQuote } from './market';
import { StockThesis } from './ai';

export interface WatchlistEntity {
    id: string;
    userId: string;
    symbol: string;
    company: string;
    addedAt: string | null;
    quote?: StockQuote;
    aiSignal?: {
        verdict?: StockThesis['verdict'];
        sentimentScore?: number;
        lastUpdated?: string;
    };
}

export type WatchlistSortOption = 'symbol' | 'addedAt' | 'price' | 'changePercent';
