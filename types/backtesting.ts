import { RiskSeverity, DownsideRiskAssessment } from './risk';

export interface DownsideEventDefinition {
    horizonDays: number; // e.g. 5 or 10 actual trading sessions
    thresholdPercent: number; // e.g. -5.0 or -8.0 (negative number)
    targetType: 'closing_decline';
    description: string;
}

export interface DownsideEventLabel {
    assessmentDate: string; // ISO date YYYY-MM-DD
    assessmentClose: number;
    horizonDays: number;
    futureCloses: number[];
    minFutureClose: number;
    maxDeclinePercent: number;
    isDownsideEvent: boolean;
    isIncomplete: boolean; // true if fewer than horizonDays future trading sessions exist
    explanation: string;
}

export interface BacktestObservation {
    symbol: string;
    date: string; // ISO date YYYY-MM-DD
    close: number;
    riskAssessment?: DownsideRiskAssessment;
    predictedDownside: boolean; // e.g. severity >= signalSeverityThreshold
    primaryOutcome: DownsideEventLabel;
    secondaryOutcome?: DownsideEventLabel;
    isEligible: boolean; // true if sufficient history for features AND complete future horizon
    exclusionReason?: 'insufficient_history' | 'incomplete_future_horizon' | 'corrupt_bar';
    baselinePriceBelowSMA200?: boolean;
    baselineMarketIndexContext?: boolean;
    leadTimeDays?: number; // Days from assessment until first downside breach (for TPs)
}

export interface ConfusionMatrix {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    totalObservations: number;
    eligibleObservations: number;
    excludedIncompleteHorizon: number;
    excludedInsufficientHistory: number;
}

export interface EvaluationMetrics {
    precision: number | null; // TP / (TP + FP)
    recall: number | null; // TP / (TP + FN)
    specificity: number | null; // TN / (TN + FP)
    falsePositiveRate: number | null; // FP / (FP + TN)
    eventBaseRate: number | null; // (TP + FN) / Eligible
    f1Score: number | null; // Harmonic mean of precision and recall
    alertsPerSymbolPerYear: number | null; // (TP + FP) / (Symbols * (TradingDays / 252))
    medianLeadTimeDays: number | null; // Median trading days to first breach for TPs
    metricNotes: Record<string, string>;
}

export interface BaselineComparison {
    name: string;
    description: string;
    eligibleCount: number;
    eventCount: number;
    confusionMatrix: ConfusionMatrix;
    metrics: EvaluationMetrics;
    isAvailable: boolean;
    unavailableReason?: string;
}

export interface BacktestConfig {
    symbols: string[];
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    primaryHorizonDays: number; // default: 5
    primaryThresholdPercent: number; // default: -5.0
    secondaryHorizonDays: number; // default: 10
    secondaryThresholdPercent: number; // default: -8.0
    signalSeverityThreshold: RiskSeverity; // e.g. 'warning' => 'warning' or 'critical' = signal
    minHistoryWarmupDays: number; // default: 200 (for 200-day SMA)
    includeBaselines: boolean;
    persistRun?: boolean;
}

export interface BacktestReport {
    runId: string;
    engineVersion: string;
    executedAt: string;
    config: BacktestConfig;
    symbolsEvaluated: string[];
    dateRange: { from: string; to: string };
    totalBarsLoaded: number;
    dataQualitySummary: {
        missingDatesCount: number;
        duplicateDatesCount: number;
        insufficientHistorySymbols: string[];
        warnings: string[];
    };
    primaryTarget: {
        definition: DownsideEventDefinition;
        confusionMatrix: ConfusionMatrix;
        metrics: EvaluationMetrics;
    };
    secondaryTarget?: {
        definition: DownsideEventDefinition;
        confusionMatrix: ConfusionMatrix;
        metrics: EvaluationMetrics;
    };
    baselines: {
        unconditional: BaselineComparison;
        sma200Breakdown: BaselineComparison;
        marketIndex?: BaselineComparison;
    };
    perSymbolSummaries: Record<
        string,
        {
            totalBars: number;
            eligibleObservations: number;
            signalsTriggered: number;
            eventsOccurred: number;
            precision: number | null;
            recall: number | null;
        }
    >;
    statisticalLimitations: string[];
}
