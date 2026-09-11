import { NewsSentimentAnalysis } from './ai';

export interface NewsArticleEntity {
    id: number | string;
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number;
    category?: string;
    relatedSymbol?: string;
    image?: string;
    aiSentiment?: NewsSentimentAnalysis;
}

export interface NewsFilterOptions {
    symbols?: string[];
    category?: 'general' | 'forex' | 'crypto' | 'merger';
    limit?: number;
}
