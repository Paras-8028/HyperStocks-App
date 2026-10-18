import { BacktestObservation, ConfusionMatrix, EvaluationMetrics, BaselineComparison } from '@/types/backtesting';
import { PerformanceEvaluator } from './PerformanceEvaluator';
import { HistoricalBarInput } from './BacktestEngine';

export interface ConfidenceInterval {
    lower: number;
    upper: number;
    confidenceLevel: number;
}

export interface DataReadinessReport {
    symbol: string;
    totalBars: number;
    dateRange: { from: string; to: string } | null;
    tradingDaysSpan: number;
    duplicateDatesCount: number;
    invalidOHLCCount: number;
    negativeVolumeCount: number;
    isSplitAdjusted: boolean;
    isDividendAdjusted: boolean;
    isSufficientForBacktest: boolean;
    requiredBars: number;
    deficiencyReason?: string;
}

export interface OutOfSampleEvaluation {
    totalEligible: number;
    inSample: {
        dateRange: { from: string; to: string };
        eligibleCount: number;
        confusionMatrix: ConfusionMatrix;
        metrics: EvaluationMetrics;
        precisionCI: ConfidenceInterval | null;
        recallCI: ConfidenceInterval | null;
    };
    outOfSample: {
        dateRange: { from: string; to: string };
        eligibleCount: number;
        confusionMatrix: ConfusionMatrix;
        metrics: EvaluationMetrics;
        precisionCI: ConfidenceInterval | null;
        recallCI: ConfidenceInterval | null;
    };
    isStatisticallyReliable: boolean;
    reliabilityAssessment: string;
}

export class StatisticalValidator {
    /**
     * Calculates the Wilson score confidence interval for a binomial proportion.
     * Preferred over normal approximation for small sample sizes or extreme proportions.
     * 
     * @param successes Number of positive trials (e.g. True Positives)
     * @param trials Total number of trials (e.g. TP + FP for precision, TP + FN for recall)
     * @param confidenceLevel Confidence level (default 0.95 for 95% CI)
     */
    public static calculateConfidenceInterval(
        successes: number,
        trials: number,
        confidenceLevel: number = 0.95
    ): ConfidenceInterval | null {
        if (trials <= 0) return null;

        // z-score for standard confidence levels
        const z = confidenceLevel === 0.99 ? 2.576 : confidenceLevel === 0.90 ? 1.645 : 1.96; // default 95%

        const p = successes / trials;
        const z2 = z * z;
        const denominator = 1 + z2 / trials;
        const center = (p + z2 / (2 * trials)) / denominator;
        const margin = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denominator;

        const lower = Math.max(0, Number((center - margin).toFixed(4)));
        const upper = Math.min(1, Number((center + margin).toFixed(4)));

        return {
            lower,
            upper,
            confidenceLevel,
        };
    }

    /**
     * Audits the data quality and backtest readiness of a set of historical price bars.
     */
    public static auditDataReadiness(
        symbol: string,
        bars: HistoricalBarInput[],
        requiredWarmup: number = 200,
        requiredHorizon: number = 5
    ): DataReadinessReport {
        const requiredBars = requiredWarmup + requiredHorizon;

        if (!bars || bars.length === 0) {
            return {
                symbol,
                totalBars: 0,
                dateRange: null,
                tradingDaysSpan: 0,
                duplicateDatesCount: 0,
                invalidOHLCCount: 0,
                negativeVolumeCount: 0,
                isSplitAdjusted: false,
                isDividendAdjusted: false,
                isSufficientForBacktest: false,
                requiredBars,
                deficiencyReason: 'Zero historical bars available in local dataset.',
            };
        }

        const sorted = [...bars].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let duplicateDatesCount = 0;
        let invalidOHLCCount = 0;
        let negativeVolumeCount = 0;
        const seenDates = new Set<string>();

        for (const bar of sorted) {
            const dateStr = new Date(bar.timestamp).toISOString().split('T')[0];
            if (seenDates.has(dateStr)) {
                duplicateDatesCount++;
            }
            seenDates.add(dateStr);

            // OHLC validation
            if (bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0) {
                invalidOHLCCount++;
            } else if (bar.high < bar.low || bar.open > bar.high || bar.close > bar.high || bar.open < bar.low || bar.close < bar.low) {
                invalidOHLCCount++;
            }

            if (bar.volume < 0) {
                negativeVolumeCount++;
            }
        }

        const fromStr = new Date(sorted[0].timestamp).toISOString().split('T')[0];
        const toStr = new Date(sorted[sorted.length - 1].timestamp).toISOString().split('T')[0];
        const isSufficient = sorted.length >= requiredBars && invalidOHLCCount === 0;

        let deficiencyReason: string | undefined;
        if (sorted.length < requiredBars) {
            deficiencyReason = `Insufficient history: ${sorted.length} bars available, required at least ${requiredBars} (${requiredWarmup} warmup + ${requiredHorizon} horizon).`;
        } else if (invalidOHLCCount > 0) {
            deficiencyReason = `Corrupt price bars: ${invalidOHLCCount} bars failed basic OHLC consistency checks.`;
        }

        return {
            symbol,
            totalBars: sorted.length,
            dateRange: { from: fromStr, to: toStr },
            tradingDaysSpan: sorted.length,
            duplicateDatesCount,
            invalidOHLCCount,
            negativeVolumeCount,
            isSplitAdjusted: Boolean((sorted[0] as any).isSplitAdjusted),
            isDividendAdjusted: Boolean((sorted[0] as any).isDividendAdjusted),
            isSufficientForBacktest: isSufficient,
            requiredBars,
            deficiencyReason,
        };
    }

    /**
     * Performs a chronological Out-Of-Sample (OOS) evaluation to reduce evaluation bias.
     * Splits eligible observations into an in-sample period (e.g. first 70%) and out-of-sample period (remaining 30%).
     */
    public static evaluateOutOfSample(
        observations: BacktestObservation[],
        trainRatio: number = 0.70
    ): OutOfSampleEvaluation {
        const eligible = observations.filter((o) => o.isEligible && !o.primaryOutcome.isIncomplete);

        if (eligible.length === 0) {
            const emptyMatrix: ConfusionMatrix = {
                truePositives: 0,
                falsePositives: 0,
                trueNegatives: 0,
                falseNegatives: 0,
                totalObservations: 0,
                eligibleObservations: 0,
                excludedIncompleteHorizon: 0,
                excludedInsufficientHistory: 0,
            };
            const emptyMetrics = PerformanceEvaluator.calculateMetrics(emptyMatrix);
            return {
                totalEligible: 0,
                inSample: {
                    dateRange: { from: 'N/A', to: 'N/A' },
                    eligibleCount: 0,
                    confusionMatrix: emptyMatrix,
                    metrics: emptyMetrics,
                    precisionCI: null,
                    recallCI: null,
                },
                outOfSample: {
                    dateRange: { from: 'N/A', to: 'N/A' },
                    eligibleCount: 0,
                    confusionMatrix: emptyMatrix,
                    metrics: emptyMetrics,
                    precisionCI: null,
                    recallCI: null,
                },
                isStatisticallyReliable: false,
                reliabilityAssessment: 'Zero eligible observations available for out-of-sample evaluation.',
            };
        }

        const sorted = [...eligible].sort((a, b) => a.date.localeCompare(b.date));
        const splitIdx = Math.floor(sorted.length * trainRatio);

        const inSampleObs = sorted.slice(0, splitIdx);
        const outOfSampleObs = sorted.slice(splitIdx);

        // Build confusion matrices
        const inSampleMatrix = PerformanceEvaluator.calculateConfusionMatrix(
            inSampleObs.map((o) => ({
                predicted: o.predictedDownside,
                actual: o.primaryOutcome.isDownsideEvent,
                isEligible: true,
                isIncomplete: false,
            }))
        );
        const inSampleMetrics = PerformanceEvaluator.calculateMetrics(inSampleMatrix);
        const inSamplePrecCI = this.calculateConfidenceInterval(
            inSampleMatrix.truePositives,
            inSampleMatrix.truePositives + inSampleMatrix.falsePositives
        );
        const inSampleRecCI = this.calculateConfidenceInterval(
            inSampleMatrix.truePositives,
            inSampleMatrix.truePositives + inSampleMatrix.falseNegatives
        );

        const outOfSampleMatrix = PerformanceEvaluator.calculateConfusionMatrix(
            outOfSampleObs.map((o) => ({
                predicted: o.predictedDownside,
                actual: o.primaryOutcome.isDownsideEvent,
                isEligible: true,
                isIncomplete: false,
            }))
        );
        const outOfSampleMetrics = PerformanceEvaluator.calculateMetrics(outOfSampleMatrix);
        const outOfSamplePrecCI = this.calculateConfidenceInterval(
            outOfSampleMatrix.truePositives,
            outOfSampleMatrix.truePositives + outOfSampleMatrix.falsePositives
        );
        const outOfSampleRecCI = this.calculateConfidenceInterval(
            outOfSampleMatrix.truePositives,
            outOfSampleMatrix.truePositives + outOfSampleMatrix.falseNegatives
        );

        // Minimum threshold for statistically meaningful OOS validation:
        // At least 100 eligible OOS observations and at least 5 positive events
        const isReliable = outOfSampleObs.length >= 100 && (outOfSampleMatrix.truePositives + outOfSampleMatrix.falseNegatives) >= 5;

        const reliabilityAssessment = isReliable
            ? `Out-of-sample partition contains ${outOfSampleObs.length} sessions and ${outOfSampleMatrix.truePositives + outOfSampleMatrix.falseNegatives} downside events, meeting minimal statistical criteria.`
            : `Out-of-sample sample size (${outOfSampleObs.length} sessions, ${outOfSampleMatrix.truePositives + outOfSampleMatrix.falseNegatives} downside events) is insufficient for definitive statistical inference. Results must be interpreted with extreme caution.`;

        return {
            totalEligible: eligible.length,
            inSample: {
                dateRange: {
                    from: inSampleObs[0]?.date || 'N/A',
                    to: inSampleObs[inSampleObs.length - 1]?.date || 'N/A',
                },
                eligibleCount: inSampleObs.length,
                confusionMatrix: inSampleMatrix,
                metrics: inSampleMetrics,
                precisionCI: inSamplePrecCI,
                recallCI: inSampleRecCI,
            },
            outOfSample: {
                dateRange: {
                    from: outOfSampleObs[0]?.date || 'N/A',
                    to: outOfSampleObs[outOfSampleObs.length - 1]?.date || 'N/A',
                },
                eligibleCount: outOfSampleObs.length,
                confusionMatrix: outOfSampleMatrix,
                metrics: outOfSampleMetrics,
                precisionCI: outOfSamplePrecCI,
                recallCI: outOfSampleRecCI,
            },
            isStatisticallyReliable: isReliable,
            reliabilityAssessment,
        };
    }

    /**
     * Implements a time-block bootstrap resampling method to estimate confidence intervals
     * while preserving short-term serial dependence and autocorrelation across overlapping horizons.
     * 
     * @param observations Array of eligible observations
     * @param blockSize Number of consecutive trading sessions per block (e.g. 5 days to match primary horizon)
     * @param iterations Number of bootstrap replications (default 500)
     */
    public static timeBlockBootstrap(
        observations: BacktestObservation[],
        blockSize: number = 5,
        iterations: number = 500
    ): {
        precisionMean: number | null;
        precisionCI: ConfidenceInterval | null;
        recallMean: number | null;
        recallCI: ConfidenceInterval | null;
        iterationsCount: number;
    } {
        const eligible = observations.filter((o) => o.isEligible && !o.primaryOutcome.isIncomplete);
        if (eligible.length < blockSize * 4) {
            return {
                precisionMean: null,
                precisionCI: null,
                recallMean: null,
                recallCI: null,
                iterationsCount: 0,
            };
        }

        // Partition into consecutive blocks
        const blocks: BacktestObservation[][] = [];
        for (let i = 0; i <= eligible.length - blockSize; i += blockSize) {
            blocks.push(eligible.slice(i, i + blockSize));
        }

        if (blocks.length === 0) {
            return {
                precisionMean: null,
                precisionCI: null,
                recallMean: null,
                recallCI: null,
                iterationsCount: 0,
            };
        }

        const bootstrapPrecisions: number[] = [];
        const bootstrapRecalls: number[] = [];

        for (let iter = 0; iter < iterations; iter++) {
            // Sample blocks with replacement to assemble a synthetic dataset of identical length
            const sampleObs: BacktestObservation[] = [];
            while (sampleObs.length < eligible.length) {
                const randomBlock = blocks[Math.floor(Math.random() * blocks.length)];
                sampleObs.push(...randomBlock);
            }

            const matrix = PerformanceEvaluator.calculateConfusionMatrix(
                sampleObs.map((o) => ({
                    predicted: o.predictedDownside,
                    actual: o.primaryOutcome.isDownsideEvent,
                    isEligible: true,
                    isIncomplete: false,
                }))
            );

            if (matrix.truePositives + matrix.falsePositives > 0) {
                bootstrapPrecisions.push(matrix.truePositives / (matrix.truePositives + matrix.falsePositives));
            }
            if (matrix.truePositives + matrix.falseNegatives > 0) {
                bootstrapRecalls.push(matrix.truePositives / (matrix.truePositives + matrix.falseNegatives));
            }
        }

        // Calculate bootstrap empirical 95% CI (2.5th and 97.5th percentiles)
        let precCI: ConfidenceInterval | null = null;
        let precMean: number | null = null;
        if (bootstrapPrecisions.length >= 20) {
            bootstrapPrecisions.sort((a, b) => a - b);
            const pLower = bootstrapPrecisions[Math.floor(0.025 * bootstrapPrecisions.length)];
            const pUpper = bootstrapPrecisions[Math.floor(0.975 * bootstrapPrecisions.length)];
            precMean = Number((bootstrapPrecisions.reduce((a, b) => a + b, 0) / bootstrapPrecisions.length).toFixed(4));
            precCI = { lower: Number(pLower.toFixed(4)), upper: Number(pUpper.toFixed(4)), confidenceLevel: 0.95 };
        }

        let recCI: ConfidenceInterval | null = null;
        let recMean: number | null = null;
        if (bootstrapRecalls.length >= 20) {
            bootstrapRecalls.sort((a, b) => a - b);
            const rLower = bootstrapRecalls[Math.floor(0.025 * bootstrapRecalls.length)];
            const rUpper = bootstrapRecalls[Math.floor(0.975 * bootstrapRecalls.length)];
            recMean = Number((bootstrapRecalls.reduce((a, b) => a + b, 0) / bootstrapRecalls.length).toFixed(4));
            recCI = { lower: Number(rLower.toFixed(4)), upper: Number(rUpper.toFixed(4)), confidenceLevel: 0.95 };
        }

        return {
            precisionMean: precMean,
            precisionCI: precCI,
            recallMean: recMean,
            recallCI: recCI,
            iterationsCount: iterations,
        };
    }
}
