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
