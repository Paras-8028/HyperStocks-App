import { NewsSentimentAnalysis } from './ai';

// ==========================================
// TIER 1: RAW NEWS DATA (Reliable Data Source)
// ==========================================
export interface RawNewsArticle {
    id: number | string;
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number; // Unix timestamp in ms
    category?: string;
    relatedSymbol?: string;
    image?: string;
}

// Backwards compatibility alias
export interface NewsArticleEntity extends RawNewsArticle {
    aiSentiment?: NewsSentimentAnalysis;
}

export interface NewsFilterOptions {
    symbols?: string[];
    category?: 'general' | 'forex' | 'crypto' | 'merger' | string;
    limit?: number;
}

// ==========================================
// TIER 2: NEWS ANALYSIS (Deterministic / Parsed)
// ==========================================
export type NewsSentimentLabel = 'positive' | 'neutral' | 'negative';

export interface NewsSentiment {
    label: NewsSentimentLabel;
    score: number; // -1.0 (extremely negative) to +1.0 (extremely positive)
    confidence: number; // 0.0 to 1.0
}

export interface StockImpact {
    symbol: string;
    companyName?: string;
    direction: 'positive' | 'neutral' | 'negative';
    magnitude: 'high' | 'medium' | 'low';
    reason?: string;
}

export interface SectorImpact {
    sector: string;
    direction: 'positive' | 'neutral' | 'negative';
    weight: number; // 0 to 1
}

export interface AnalyzedNewsArticle extends RawNewsArticle {
    sentiment: NewsSentiment;
    affectedStocks: StockImpact[];
    affectedSectors: SectorImpact[];
    keyPhrases?: string[];
}

export interface NewsCluster {
    id: string;
    topic: string;
    primaryHeadline: string;
    summary: string;
    dominantSentiment: NewsSentimentLabel;
    articles: AnalyzedNewsArticle[];
    affectedStocks: StockImpact[];
    affectedSectors: SectorImpact[];
    firstReported: number;
    lastUpdated: number;
}

export interface MarketTimelineEvent {
    id: string;
    timestamp: number;
    title: string;
    summary: string;
    sentiment: NewsSentimentLabel;
    keySymbols: string[];
    primarySector?: string;
    source: string;
    url?: string;
    clusterId?: string;
}

// ==========================================
// TIER 3: AI INTERPRETATION (Gemini 3.6 Engine)
// ==========================================
export interface AINewsMarketSummary {
    headline: string;
    marketNarrative: string;
    keyCatalysts: string[];
    topRisks: string[];
    topOpportunities: string[];
    timestamp: number;
}

export interface PersonalizedNewsItem {
    cluster: NewsCluster;
    relevanceScore: number; // 0 to 100
    personalExplanation: string; // e.g. "This news matters to you because..."
    userRelevanceReasons: string[];
}

export interface NewsIntelligenceResponse {
    marketSummary: AINewsMarketSummary;
    timeline: MarketTimelineEvent[];
    clusters: NewsCluster[];
    personalizedFeed: PersonalizedNewsItem[];
    totalArticlesAnalyzed: number;
    timestamp: number;
}

export interface NewsIntelligenceOptions {
    userId?: string;
    watchlistSymbols?: string[];
    portfolioSymbols?: string[];
    preferredSectors?: string[];
    investmentExperience?: string;
    riskTolerance?: string;
    category?: string;
    limit?: number;
}
