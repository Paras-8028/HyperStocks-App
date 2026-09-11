export interface PortfolioPosition {
    id: string;
    userId: string;
    symbol: string;
    companyName?: string;
    shares: number;
    costBasis: number;
    buyDate?: string;
    notes?: string;
    sector?: string;
    beta?: number;
    // Computed live fields
    currentPrice?: number;
    dailyChange?: number;
    dailyChangePercent?: number;
    marketValue?: number;
    totalCost?: number;
    unrealizedGainLoss?: number;
    unrealizedGainLossPercent?: number;
    allocationPercent?: number;
}

export interface SectorExposure {
    sector: string;
    value: number;
    percent: number;
    benchmarkDelta: number; // vs S&P 500 benchmark weight
}

export interface ConcentrationAnalysis {
    topStock: {
        symbol: string;
        percent: number;
    };
    top3Percent: number;
    isConcentrated: boolean;
    hhiIndex: number; // Herfindahl-Hirschman Index: < 1500 diversified, 1500-2500 moderate, > 2500 concentrated
    diversificationLevel: 'Well Diversified' | 'Moderately Concentrated' | 'Highly Concentrated';
}

export interface PerformanceAttribution {
    dailyGainLoss: number;
    dailyGainLossPercent: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    topContributors: {
        symbol: string;
        dollarContribution: number;
        percentReturn: number;
    }[];
    bottomDetractors: {
        symbol: string;
        dollarContribution: number;
        percentReturn: number;
    }[];
}

export interface PortfolioRiskMetrics {
    weightedBeta: number;
    volatilityLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
    concentrationRiskScore: number; // 0 (safely diversified) to 100 (extreme concentration)
    marketExposureRisk: string;
}

export interface PortfolioAlertItem {
    id: string;
    type: 'concentration' | 'volatility' | 'drawdown' | 'earnings' | 'rebalance';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    affectedSymbol?: string;
    timestamp: number;
}

export interface PortfolioSummary {
    totalValue: number;
    totalCost: number;
    totalUnrealizedGainLoss: number;
    totalGainLossPercent: number;
    dailyGainLoss: number;
    dailyGainLossPercent: number;
    positionCount: number;
    topPerformer?: {
        symbol: string;
        gainPercent: number;
    };
    worstPerformer?: {
        symbol: string;
        lossPercent: number;
    };
    sectorAllocation: Record<string, number>;
}

export interface DeterministicPortfolioAnalysis {
    summary: PortfolioSummary;
    positions: PortfolioPosition[];
    sectorExposures: SectorExposure[];
    concentration: ConcentrationAnalysis;
    attribution: PerformanceAttribution;
    riskMetrics: PortfolioRiskMetrics;
    alerts: PortfolioAlertItem[];
    calculatedAt: string;
}

export interface AIPortfolioReport {
    deterministic: DeterministicPortfolioAnalysis;
    aiIntelligence: {
        executiveSummary: string;
        performanceExplanation: {
            gainsDriver: string;
            lossesDriver: string;
        };
        insights: string[];
        recommendations: {
            title: string;
            suggestion: string;
            actionType: 'rebalance' | 'diversify' | 'hedge' | 'review';
        }[];
        confidenceScore: number;
        disclaimer: string;
    };
    generatedAt: string;
}
