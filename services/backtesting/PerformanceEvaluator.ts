import {
    DownsideEventDefinition,
    DownsideEventLabel,
    ConfusionMatrix,
    EvaluationMetrics,
    BaselineComparison,
    BacktestObservation,
} from '@/types/backtesting';

export class PerformanceEvaluator {
    /**
     * Evaluates whether a future downside event occurred following an assessment date t.
     * 
     * Target Definition:
     * Y(t) = 1 if min(C[t+1], ..., C[t+H]) / C[t] - 1 <= (thresholdPercent / 100); otherwise Y(t) = 0.
     * 
     * @param assessmentClose Closing price on date t
     * @param futureCloses Array of consecutive future trading session closes C[t+1] ... C[t+H]
     * @param horizonDays Required number of future trading sessions (e.g. 5 or 10)
     * @param thresholdPercent Threshold drop percentage as a negative number (e.g. -5.0 for -5%)
     * @param assessmentDate Optional ISO date string for labeling
     */
    public static evaluateOutcome(
        assessmentClose: number,
        futureCloses: number[],
        horizonDays: number,
        thresholdPercent: number,
        assessmentDate: string = ''
    ): DownsideEventLabel {
        // Validation: Must have at least horizonDays future trading sessions
        if (!futureCloses || futureCloses.length < horizonDays) {
            return {
                assessmentDate,
                assessmentClose,
                horizonDays,
                futureCloses: futureCloses || [],
                minFutureClose: futureCloses && futureCloses.length > 0 ? Math.min(...futureCloses) : assessmentClose,
                maxDeclinePercent: 0,
                isDownsideEvent: false,
                isIncomplete: true,
                explanation: `Incomplete future horizon: required ${horizonDays} trading sessions, but only ${futureCloses?.length || 0} available.`,
            };
        }

        // Take strictly the next horizonDays trading sessions
        const horizonCloses = futureCloses.slice(0, horizonDays);
        const minClose = Math.min(...horizonCloses);
        const maxDeclinePercent = Number((((minClose - assessmentClose) / assessmentClose) * 100).toFixed(2));

        // Threshold is negative (e.g. -5.0). Event is true if maxDeclinePercent <= thresholdPercent
        const threshold = thresholdPercent <= 0 ? thresholdPercent : -thresholdPercent;
        const isDownsideEvent = maxDeclinePercent <= threshold;

        return {
            assessmentDate,
            assessmentClose,
            horizonDays,
            futureCloses: horizonCloses,
            minFutureClose: minClose,
            maxDeclinePercent,
            isDownsideEvent,
            isIncomplete: false,
            explanation: isDownsideEvent
                ? `Downside event triggered: minimum future close $${minClose.toFixed(2)} represents a ${maxDeclinePercent}% decline (<= ${threshold}% threshold).`
                : `No downside event: maximum future decline was ${maxDeclinePercent}% (> ${threshold}% threshold).`,
        };
    }

    /**
     * Determines lead time (in trading sessions) from assessment date to the first session
     * that breaches the downside threshold.
     */
    public static calculateLeadTimeDays(
        assessmentClose: number,
        futureCloses: number[],
        horizonDays: number,
        thresholdPercent: number
    ): number | null {
        if (!futureCloses || futureCloses.length < horizonDays) return null;
        const threshold = thresholdPercent <= 0 ? thresholdPercent : -thresholdPercent;
        
        for (let i = 0; i < horizonDays; i++) {
            const decline = ((futureCloses[i] - assessmentClose) / assessmentClose) * 100;
            if (decline <= threshold) {
                return i + 1; // 1-indexed trading sessions
            }
        }
        return null;
    }

    /**
     * Builds a confusion matrix from an array of evaluation entries.
     * Strictly filters for eligible, non-incomplete observations.
     */
    public static calculateConfusionMatrix(
        entries: {
            predicted: boolean;
            actual: boolean;
            isEligible: boolean;
            isIncomplete: boolean;
            insufficientHistory?: boolean;
        }[]
    ): ConfusionMatrix {
        let tp = 0;
        let fp = 0;
        let tn = 0;
        let fn = 0;
        let excludedIncomplete = 0;
        let excludedInsufficient = 0;

        for (const entry of entries) {
            if (entry.insufficientHistory) {
                excludedInsufficient++;
                continue;
            }
            if (entry.isIncomplete || !entry.isEligible) {
                excludedIncomplete++;
                continue;
            }

            if (entry.predicted && entry.actual) {
                tp++;
            } else if (entry.predicted && !entry.actual) {
                fp++;
            } else if (!entry.predicted && !entry.actual) {
                tn++;
            } else if (!entry.predicted && entry.actual) {
                fn++;
            }
        }

        const eligible = tp + fp + tn + fn;

        return {
            truePositives: tp,
            falsePositives: fp,
            trueNegatives: tn,
            falseNegatives: fn,
            totalObservations: entries.length,
            eligibleObservations: eligible,
            excludedIncompleteHorizon: excludedIncomplete,
            excludedInsufficientHistory: excludedInsufficient,
        };
    }

    /**
     * Calculates comprehensive evaluation metrics from a confusion matrix.
     * Returns null whenever a denominator is zero, avoiding NaN or fabricated zeros.
     */
    public static calculateMetrics(
        matrix: ConfusionMatrix,
        leadTimes: number[] = [],
        totalTradingDaysSpan: number = 252,
        totalSymbols: number = 1
    ): EvaluationMetrics {
        const { truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn, eligibleObservations: eligible } = matrix;

        // 1. Precision = TP / (TP + FP)
        const precision = tp + fp > 0 ? Number((tp / (tp + fp)).toFixed(4)) : null;

        // 2. Recall (Sensitivity) = TP / (TP + FN)
        const recall = tp + fn > 0 ? Number((tp / (tp + fn)).toFixed(4)) : null;

        // 3. Specificity = TN / (TN + FP)
        const specificity = tn + fp > 0 ? Number((tn / (tn + fp)).toFixed(4)) : null;

        // 4. False Positive Rate = FP / (FP + TN) = 1 - Specificity
        const falsePositiveRate = fp + tn > 0 ? Number((fp / (fp + tn)).toFixed(4)) : null;

        // 5. Event Base Rate = (TP + FN) / Eligible
        const eventBaseRate = eligible > 0 ? Number(((tp + fn) / eligible).toFixed(4)) : null;

        // 6. F1 Score = 2 * (P * R) / (P + R)
        let f1Score: number | null = null;
        if (precision !== null && recall !== null && precision + recall > 0) {
            f1Score = Number(((2 * precision * recall) / (precision + recall)).toFixed(4));
        }

        // 7. Alerts per Symbol per Year = (TP + FP) / (Symbols * (TradingDays / 252))
        let alertsPerSymbolPerYear: number | null = null;
        const years = totalTradingDaysSpan / 252;
        if (totalSymbols > 0 && years > 0) {
            alertsPerSymbolPerYear = Number(((tp + fp) / (totalSymbols * years)).toFixed(1));
        }

        // 8. Median Lead Time for True Positives
        let medianLeadTimeDays: number | null = null;
        if (leadTimes.length > 0) {
            const sorted = [...leadTimes].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            medianLeadTimeDays = sorted.length % 2 === 0
                ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1))
                : sorted[mid];
        }

        const metricNotes: Record<string, string> = {
            precision: precision === null ? 'Unavailable: Zero positive alerts generated (TP + FP = 0)' : `${(precision * 100).toFixed(1)}% of generated alerts preceded an actual downside event`,
            recall: recall === null ? 'Unavailable: Zero downside events occurred in dataset (TP + FN = 0)' : `Engine identified ${(recall * 100).toFixed(1)}% of all realized downside events`,
            specificity: specificity === null ? 'Unavailable: Zero non-event periods in dataset' : `${(specificity * 100).toFixed(1)}% of benign periods avoided false alarms`,
            baseRate: eventBaseRate === null ? 'Unavailable: No eligible observations' : `Downside events occurred in ${(eventBaseRate * 100).toFixed(1)}% of eligible trading sessions`,
            f1Score: f1Score === null ? 'Unavailable' : `Harmonic mean of precision and recall`,
        };

        return {
            precision,
            recall,
            specificity,
            falsePositiveRate,
            eventBaseRate,
            f1Score,
            alertsPerSymbolPerYear,
            medianLeadTimeDays,
            metricNotes,
        };
    }

    /**
     * Evaluates an Unconditional Baseline (always predicts downside event).
     */
    public static evaluateBaselineUnconditional(observations: BacktestObservation[]): BaselineComparison {
        const eligible = observations.filter((o) => o.isEligible && !o.primaryOutcome.isIncomplete);
        const entries = eligible.map((o) => ({
            predicted: true, // Always signals
            actual: o.primaryOutcome.isDownsideEvent,
            isEligible: true,
            isIncomplete: false,
        }));

        const matrix = this.calculateConfusionMatrix(entries);
        const metrics = this.calculateMetrics(matrix);

        return {
            name: 'Unconditional Always-Alert Baseline',
            description: 'Naive baseline that raises a downside alert on every trading day regardless of market signals.',
            eligibleCount: eligible.length,
            eventCount: matrix.truePositives + matrix.falseNegatives,
            confusionMatrix: matrix,
            metrics,
            isAvailable: true,
        };
    }

    /**
     * Evaluates Simple Price Below 200-Day SMA Baseline.
     */
    public static evaluateBaselineSMA200(observations: BacktestObservation[]): BaselineComparison {
        const eligible = observations.filter((o) => o.isEligible && !o.primaryOutcome.isIncomplete);
        const entries = eligible.map((o) => ({
            predicted: Boolean(o.baselinePriceBelowSMA200),
            actual: o.primaryOutcome.isDownsideEvent,
            isEligible: true,
            isIncomplete: false,
        }));

        const matrix = this.calculateConfusionMatrix(entries);
        const metrics = this.calculateMetrics(matrix);

        return {
            name: 'Price Below 200-Day SMA Baseline',
            description: 'Heuristic baseline that flags downside risk whenever the completed daily close falls below its trailing 200-day Simple Moving Average.',
            eligibleCount: eligible.length,
            eventCount: matrix.truePositives + matrix.falseNegatives,
            confusionMatrix: matrix,
            metrics,
            isAvailable: true,
        };
    }

    /**
     * Evaluates Market Index Baseline if index data is provided.
     */
    public static evaluateBaselineMarketIndex(
        observations: BacktestObservation[],
        indexBelowSMA200ByDate?: Map<string, boolean>
    ): BaselineComparison {
        if (!indexBelowSMA200ByDate || indexBelowSMA200ByDate.size === 0) {
            const emptyMatrix: ConfusionMatrix = {
                truePositives: 0,
                falsePositives: 0,
                trueNegatives: 0,
                falseNegatives: 0,
                totalObservations: observations.length,
                eligibleObservations: 0,
                excludedIncompleteHorizon: 0,
                excludedInsufficientHistory: 0,
            };
            return {
                name: 'Market Index Context Baseline',
                description: 'Macro baseline flagging downside risk when benchmark market index (e.g. SPY) trades below its 200-day SMA.',
                eligibleCount: 0,
                eventCount: 0,
                confusionMatrix: emptyMatrix,
                metrics: this.calculateMetrics(emptyMatrix),
                isAvailable: false,
                unavailableReason: 'No local historical benchmark index (e.g. SPY/QQQ) observations were provided. Comparison omitted without network requests.',
            };
        }

        const eligible = observations.filter((o) => o.isEligible && !o.primaryOutcome.isIncomplete);
        const entries = eligible.map((o) => ({
            predicted: Boolean(indexBelowSMA200ByDate.get(o.date)),
            actual: o.primaryOutcome.isDownsideEvent,
            isEligible: true,
            isIncomplete: false,
        }));

        const matrix = this.calculateConfusionMatrix(entries);
        const metrics = this.calculateMetrics(matrix);

        return {
            name: 'Market Index Context Baseline',
            description: 'Macro baseline flagging downside risk when benchmark market index trades below its 200-day SMA.',
            eligibleCount: eligible.length,
            eventCount: matrix.truePositives + matrix.falseNegatives,
            confusionMatrix: matrix,
            metrics,
            isAvailable: true,
        };
    }
}
