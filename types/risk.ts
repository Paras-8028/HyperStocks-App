/**
 * HyperStocks Phase 3: Quantitative Downside-Risk Engine Types
 *
 * All risk metrics in this system are explainable, backward-looking empirical observations
 * derived directly from verified market prices. No uncalibrated probability claims are made.
 */

export type RiskDataQuality = 'sufficient' | 'marginal' | 'insufficient' | 'unavailable';
export type RiskSeverity = 'low' | 'advisory' | 'warning' | 'critical';

export interface RiskIndicatorMeasurement<T> {
    indicatorName: string;
    value: T | null;
    displayValue: string;
    observationWindow: string; // e.g. "21 Trading Days (~1 Month)"
    observationsCount: number;
    requiredObservations: number;
    dataQuality: RiskDataQuality;
    isTriggered: boolean;
    severity: RiskSeverity;
    formula: string;
    explanation: string;
    limitations: string;
}

export interface MovingAverageBreakdownData {
    periodDays: number;
    movingAveragePrice: number;
    currentPrice: number;
    percentBelow: number; // positive percentage below MA
    isBreakdown: boolean;
}

export interface ProximityToLowData {
    periodDays: number; // e.g. 252 for 52-week low
    historicalLowPrice: number;
    currentPrice: number;
    percentAboveLow: number;
    isNearLow: boolean; // e.g. within 5% of low
}

export interface VolatilityExpansionData {
    shortTermPeriodDays: number;
    shortTermVolatility: number;
    baselinePeriodDays: number;
    baselineVolatility: number;
    expansionRatio: number;
    isExpanding: boolean;
}

export interface TriggeredRiskCondition {
    category: 'volatility_spike' | 'drawdown' | 'ma_breakdown' | 'var_exceedance' | 'historical_low';
    severity: RiskSeverity;
    title: string;
    measurement: string;
    evidence: string;
    observationWindow: string;
    thresholdApplied: string;
}

export interface DownsideRiskAssessment {
    symbol: string;
    companyName: string;
    currentPrice: number;
    assessmentTimestamp: number;
    dataFreshness: string;
    dataWindow: {
        fromTimestamp: number;
        toTimestamp: number;
        totalCandles: number;
        validPriceObservations: number;
    };
    overallDataQuality: RiskDataQuality;

    // 1. Historical Volatility (Annualized rolling standard deviation)
    historicalVolatility21d: RiskIndicatorMeasurement<number>;
    historicalVolatility63d: RiskIndicatorMeasurement<number>;

    // 2. Value at Risk (Historical 95% Daily VaR, reported as positive loss magnitude)
    historicalVaR95: RiskIndicatorMeasurement<number>;

    // 3. Conditional Value at Risk (Average loss in historical 5% tail)
    historicalCVaR95: RiskIndicatorMeasurement<number>;

    // 4. Maximum Drawdown (Largest peak-to-trough decline over observation window)
    maximumDrawdown: RiskIndicatorMeasurement<number>;

    // 5. Moving Average Breakdown (Price breakdown below 200-day or 50-day SMA)
    movingAverageBreakdown: RiskIndicatorMeasurement<MovingAverageBreakdownData>;

    // 6. Proximity to Historical Lows (Proximity to 52-week / 252-day low)
    proximityToLow: RiskIndicatorMeasurement<ProximityToLowData>;

    // 7. Volatility Expansion (Ratio of short-term to baseline volatility)
    volatilityExpansion: RiskIndicatorMeasurement<VolatilityExpansionData>;

    // Aggregated Results
    triggeredConditions: TriggeredRiskCondition[];
    overallRiskSeverity: RiskSeverity;

    // Transparent rule-based composite index (0 - 100 scale, NOT a probability)
    experimentalRiskScore: number;
    scoreInterpretation: string;

    summary: string;
    methodologyNotes: string[];
    calculationVersion: string;
    referencePriceType?: 'completed_daily_close' | 'live_intraday_quote';
    dataAsOfTimestamp?: number;
}

export interface BatchRiskEvaluationResult {
    evaluatedCount: number;
    assessments: Map<string, DownsideRiskAssessment>;
    errors: Array<{ symbol: string; error: string }>;
}
