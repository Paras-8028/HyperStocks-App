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

export type NewsSentimentClass = 'bullish' | 'bearish' | 'neutral' | 'mixed';

export interface NewsConfidenceDimensions {
    /** 0.0 to 1.0 reflecting publisher editorial authority, verification standards, and primary vs aggregator status */
    sourceReliabilityScore: number;
    sourceReliabilityTier: 'tier_1_wire' | 'institutional_press' | 'secondary_aggregator' | 'unverified';
    sourceReliabilityRationale: string;

    /** 0.0 to 1.0 reflecting the factual clarity, absence of ambiguity, and direct quantitative support in text */
    interpretationConfidenceScore: number;
    interpretationRationale: string;

    /** 0.0 (low uncertainty / narrow dispersion) to 1.0 (extreme directional uncertainty / high variance) */
    marketDirectionalUncertaintyScore: number;
    directionalUncertaintyLevel: 'low' | 'moderate' | 'high' | 'extreme';
    directionalUncertaintyRationale: string;

    /** Explicit disclaimer noting that heuristic scores are uncalibrated without out-of-sample statistical fitting */
    calibrationDisclaimer: string;
}

export interface HorizonReturnStats {
    horizonDays: 1 | 5 | 20;
    sampleCount: number;
    meanReturnPercent: number | null;
    medianReturnPercent: number | null;
    volatilityPercent: number | null;
    winRatePercent: number | null;
    meanReturn95CI: { lower: number; upper: number } | null;
    winRate95CI: { lower: number; upper: number } | null;
    unconditionalBaselineMeanPercent: number | null;
    excessReturnPercent: number | null;
}

export interface SentimentClassEvaluation {
    sentiment: NewsSentimentClass;
    totalEvents: number;
    horizons: {
        h1: HorizonReturnStats;
        h5: HorizonReturnStats;
        h20: HorizonReturnStats;
    };
}

export type EvaluationIntegrityStatus =
    | 'NO_HISTORICAL_RECORDS'
    | 'INSUFFICIENT_OBSERVATIONS'
    | 'INCOMPLETE_PRICE_COVERAGE'
    | 'EVALUATION_COMPLETED_UNCERTAIN'
    | 'EVALUATION_COMPLETED_SUFFICIENT_DATA';

export type SentimentDataProvenance =
    | 'point_in_time_recorded'
    | 'retrospective_inference'
    | 'unarchived_live'
    | 'none';

export interface HistoricalSentimentEvaluationReport {
    symbol?: string;
    evaluatedAt: string;
    status: EvaluationIntegrityStatus;
    dataProvenance: SentimentDataProvenance;
    provenanceExplanation: string;
    totalArticlesEvaluated: number;
    eligibleArticlesWithPrices: number;
    dateRange: { from: string; to: string } | null;
    hasOverlappingHorizons: boolean;
    overlappingHorizonWarning?: string;
    effectiveObservations?: {
        h1: number;
        h5: number;
        h20: number;
    };
    sentimentCohorts: {
        bullish: SentimentClassEvaluation;
        bearish: SentimentClassEvaluation;
        neutral: SentimentClassEvaluation;
        mixed: SentimentClassEvaluation;
    };
    unconditionalBaseline: {
        h1Mean: number | null;
        h5Mean: number | null;
        h20Mean: number | null;
    };
    inSampleVsOutOfSample?: {
        inSampleCount: number;
        outOfSampleCount: number;
        inSampleDateRange: { from: string; to: string };
        outOfSampleDateRange: { from: string; to: string };
        outOfSampleH5MeanBullish: number | null;
        outOfSampleH5MeanBearish: number | null;
    };
    isStatisticallyReliable: boolean;
    dataSufficiencyAssessment: string;
    methodologyNotes: string[];
}

export interface ArticleImpactAnalysis {
    sentiment: NewsSentimentClass;
    confidenceScore: number; // Backwards-compatible alias for interpretation confidence
    confidenceRationale: string;
    confidenceDimensions?: NewsConfidenceDimensions;
    sourceReliabilityScore?: number;
    interpretationConfidenceScore?: number;
    marketDirectionalUncertaintyScore?: number;
    directionalUncertaintyLevel?: 'low' | 'moderate' | 'high' | 'extreme';
    companySentiment: NewsSentimentClass;
    marketSentiment: NewsSentimentClass;
    whatHappened: string;
    whyItMatters: string;
    shortTermOutlook: string;
    longTermConsiderations: string;
    affectedEntity: {
        name: string;
        type: 'company' | 'sector' | 'market';
        symbol?: string;
    };
    risks: string[];
    opportunities: string[];
    isAIGenerated: boolean;
    isFallback?: boolean;
    sourceEvidence?: {
        headline: string;
        source: string;
        url: string;
        datetime: number;
    };
}

// Backwards compatibility alias
export interface NewsArticleEntity extends RawNewsArticle {
    aiSentiment?: NewsSentimentAnalysis;
    aiSummary?: ArticleImpactAnalysis & {
        bottomLine?: string;
        impact?: 'positive' | 'negative' | 'mixed' | 'uncertain' | 'bullish' | 'bearish' | 'neutral';
    };
}

export interface NewsFilterOptions {
    symbols?: string[];
    category?: 'general' | 'forex' | 'crypto' | 'merger' | string;
    limit?: number;
}

// ==========================================
// TIER 2: NEWS ANALYSIS (Deterministic / Parsed)
// ==========================================
export type NewsSentimentLabel = 'positive' | 'neutral' | 'negative' | 'bullish' | 'bearish' | 'mixed';

export interface NewsSentiment {
    label: NewsSentimentLabel;
    score: number; // -1.0 (extremely negative) to +1.0 (extremely positive)
    confidence: number; // 0.0 to 1.0
    confidenceDimensions?: NewsConfidenceDimensions;
}

export interface StockImpact {
    symbol: string;
    companyName?: string;
    direction: 'positive' | 'neutral' | 'negative' | 'mixed';
    magnitude: 'high' | 'medium' | 'low';
    reason?: string;
}

export interface SectorImpact {
    sector: string;
    direction: 'positive' | 'neutral' | 'negative' | 'mixed';
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
