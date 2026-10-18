import { CompanyProfile, FinancialMetrics, StockQuote } from './market';
import { UserPreferences } from './personalization';

export type SentimentLabel = 'bullish' | 'bearish' | 'neutral';

export interface StockThesis {
    symbol: string;
    companyName: string;
    verdict: 'strong_buy' | 'buy' | 'hold' | 'underweight' | 'sell';
    confidenceScore: number; // 0 to 100
    summary: string;
    bullCase: string[];
    bearCase: string[];
    catalysts: string[];
    risks: string[];
    valuationAssessment: string;
    disclaimer: string;
    generatedAt: string;
}

export interface DetailedStockIntelligence {
    symbol: string;
    companyName: string;
    summary: string;
    bullCase: string[];
    bearCase: string[];
    technicalAnalysis: {
        trend: 'bullish' | 'bearish' | 'neutral';
        rsiExplanation: string;
        movingAveragesExplanation: string;
        macdExplanation: string;
        supportResistance: {
            keySupport: number;
            keyResistance: number;
            interpretation: string;
        };
        volumeInterpretation: string;
    };
    fundamentalAnalysis: {
        valuationInterpretation: string;
        revenueGrowthInterpretation: string;
        earningsProfitability: string;
        debtBalanceSheet: string;
        peComparison: string;
    };
    newsSentiment: {
        classification: 'Positive' | 'Neutral' | 'Negative';
        sentimentScore: number;
        reasoning: string;
        recentHeadlinesAnalysis: string[];
    };
    riskAnalysis: {
        overallRiskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
        volatilityRisk: string;
        financialRisk: string;
        marketRisk: string;
        sentimentRisk: string;
    };
    aiConfidence: {
        score: number;
        explanation: string;
        disclaimer: string;
    };
    generatedAt: string;
}

export interface NewsSentimentAnalysis {
    articleId?: number | string;
    headline: string;
    sentimentScore: number; // -1.0 (very bearish) to +1.0 (very bullish)
    label: SentimentLabel;
    keyTakeaway: string;
    affectedSymbols: string[];
}

export interface PortfolioRiskAudit {
    overallRiskScore: number; // 1 to 10 (10 = highest risk)
    diversificationScore: number; // 1 to 10 (10 = perfectly diversified)
    alignmentWithProfile: 'aligned' | 'too_aggressive' | 'too_conservative';
    concentrationRisks: string[];
    sectorExposureWarnings: string[];
    actionableSuggestions: string[];
    summary: string;
}

export interface MarketBriefing {
    date: string;
    headline: string;
    marketTone: 'bullish' | 'bearish' | 'cautious' | 'mixed';
    personalizedInsights: string[];
    watchlistHighlights: Array<{
        symbol: string;
        insight: string;
        signal: 'positive' | 'negative' | 'neutral';
    }>;
    macroFocus: string;
}

export interface CopilotMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    relatedSymbols?: string[];
    suggestedFollowUps?: string[];
}

export interface CopilotContext {
    currentSymbol?: string;
    quote?: StockQuote;
    profile?: CompanyProfile;
    metrics?: FinancialMetrics;
    userProfile?: Partial<UserPreferences>;
    watchlistSymbols?: string[];
}

export interface AIDailyBriefingData {
    greeting: string;
    marketSummary: string;
    watchlistImpact: {
        changePercent: number;
        trend: 'up' | 'down' | 'flat';
        driver: string;
    };
    attentionStocks: Array<{
        symbol: string;
        reason: string;
        priority: 'high' | 'medium';
    }>;
    importantEvents: string[];
    keyOpportunities: string[];
    keyRisks: string[];
    dateFormatted: string;
}

export interface AIMarketInsightItem {
    id: string;
    type: 'unusual_movement' | 'trending_sector' | 'unusual_volume' | 'earnings' | 'breaking_news';
    title: string;
    symbol?: string;
    description: string;
    metric?: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    timestamp: string;
}

export interface WatchlistIntelligenceItem {
    symbol: string;
    company: string;
    currentPrice: number;
    changePercent: number;
    movementReason: string;
    newsSentiment: 'bullish' | 'bearish' | 'neutral';
    sentimentScore: number;
    technicalSignal: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
    riskLevel: 'Low' | 'Medium' | 'High';
    confidenceScore: number;
}

export interface OpportunityItem {
    symbol: string;
    company: string;
    thesis: string;
    catalyst: string;
    metricsHighlight: string;
    confidence: number;
    timeframe: 'Short Term' | 'Medium Term' | 'Long Term';
    risk: 'Low' | 'Medium' | 'High';
}

export interface RiskRadarItem {
    id: string;
    category: 'concentration' | 'volatility' | 'sentiment' | 'macro';
    severity: 'critical' | 'warning' | 'advisory';
    title: string;
    description: string;
    affectedSymbols?: string[];
    suggestedAction?: string;
}

export interface AIInsightFeedItem {
    id: string;
    category: 'volume' | 'technical' | 'sentiment' | 'macro';
    content: string;
    relatedSymbol?: string;
    timeAgo: string;
}

