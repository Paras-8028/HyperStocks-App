import { PortfolioPosition } from './portfolio';

export type InvestmentExperience =
    | 'beginner'
    | 'intermediate'
    | 'advanced'
    | 'institutional';

export type InvestmentGoal =
    | 'growth'
    | 'income'
    | 'capital_preservation'
    | 'balanced'
    | 'speculation'
    | 'Growth'
    | 'Income'
    | 'Balanced'
    | 'Conservative';

export type RiskTolerance =
    | 'conservative'
    | 'moderate'
    | 'aggressive'
    | 'Low'
    | 'Medium'
    | 'High';

export type InvestmentHorizon =
    | 'short_term'
    | 'medium_term'
    | 'long_term';

export type AnalysisStyle =
    | 'fundamental'
    | 'technical'
    | 'quantitative'
    | 'balanced';

export type MarketRegion =
    | 'US'
    | 'Europe'
    | 'Asia'
    | 'Global';

export interface UserPreferences {
    userId: string;
    email: string;
    name: string;
    country: string;

    // Core Personalization Foundation
    experienceLevel: InvestmentExperience;
    investmentGoals: InvestmentGoal[] | string;
    riskTolerance: RiskTolerance;
    preferredSectors: string[];
    preferredRegions: MarketRegion[];
    investmentHorizon: InvestmentHorizon;
    preferredAnalysisStyle: AnalysisStyle;
    favoriteStocks: string[];

    // Legacy & convenience mapping
    preferredIndustry?: string;
    notificationPreferences?: {
        dailyEmailBriefing: boolean;
        priceAlertPush: boolean;
        aiSignals: boolean;
    };
    aiPersonaPreference?: 'concise' | 'in_depth' | 'technical';
    onboardingCompleted: boolean;
    lastUpdated?: string;
}

export interface UserProfile {
    preferences: UserPreferences;
    watchlistSymbols: string[];
    holdings: PortfolioPosition[];
    totalPortfolioValue?: number;
    cashBalance?: number;
}

export interface PersonalizationContext {
    userId: string;
    profile: UserProfile;
    marketRegime?: 'bull' | 'bear' | 'neutral' | 'high_volatility';
    activeSectors: string[];
    timestamp: number;
}

export interface ScoredInsight {
    id: string;
    title?: string;
    content: string;
    category: 'macro' | 'technical' | 'fundamental' | 'sentiment' | 'risk' | 'volume';
    relatedSymbol?: string;
    score: number;
    relevanceReasons: string[];
    severity?: 'info' | 'advisory' | 'warning' | 'critical';
    timeAgo?: string;
    timestamp: number;
}

export interface ScoredOpportunity {
    symbol: string;
    company: string;
    sector: string;
    thesis: string;
    catalyst: string;
    metricsHighlight: string;
    matchScore: number;
    confidence: number;
    timeframe: string;
    risk: 'Low' | 'Medium' | 'High';
    matchingFactors: string[];
}

export interface GoalProgress {
    goal: InvestmentGoal | string;
    targetHorizonYears?: number;
    recommendedAllocation: Record<string, number>;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
    userId: 'guest',
    email: '',
    name: 'Investor',
    country: 'US',
    experienceLevel: 'intermediate',
    investmentGoals: ['growth'],
    riskTolerance: 'moderate',
    preferredSectors: ['Technology', 'Healthcare', 'Financials'],
    preferredRegions: ['US', 'Global'],
    investmentHorizon: 'medium_term',
    preferredAnalysisStyle: 'balanced',
    favoriteStocks: ['AAPL', 'NVDA', 'MSFT'],
    preferredIndustry: 'Technology',
    onboardingCompleted: false,
    aiPersonaPreference: 'in_depth',
    notificationPreferences: {
        dailyEmailBriefing: true,
        priceAlertPush: true,
        aiSignals: true,
    },
};
