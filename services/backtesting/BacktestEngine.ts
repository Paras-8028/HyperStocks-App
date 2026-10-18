import { HistoricalBarModel, IHistoricalBarDocument } from '@/database/models/historical_bar.model';
import { BacktestRunModel } from '@/database/models/backtest_run.model';
import { DownsideRiskEngine } from '@/services/risk/DownsideRiskEngine';
import { PerformanceEvaluator } from '@/services/backtesting/PerformanceEvaluator';
import { StockCandlesResult } from '@/types/market';
import {
    BacktestConfig,
    BacktestObservation,
    BacktestReport,
    DownsideEventDefinition,
    ConfusionMatrix,
    EvaluationMetrics,
} from '@/types/backtesting';
import { RiskSeverity } from '@/types/risk';

export interface HistoricalBarInput {
    symbol: string;
    timestamp: Date | string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    resolution?: string;
    source?: string;
}

export class BacktestEngine {
    public static readonly VERSION = '1.0.0-phase5b';

    /**
     * Executes a deterministic offline backtest over the configured symbols and historical period.
     * 
     * @param config Simulation parameters and target definitions
     * @param inMemoryBars Optional local in-memory dataset mapping symbol -> bars (for testing/offline execution without MongoDB)
     * @param inMemoryIndexBars Optional benchmark index bars (e.g. SPY) for macro baseline evaluation
     */
    public static async runBacktest(
        config: BacktestConfig,
        inMemoryBars?: Map<string, HistoricalBarInput[]>,
        inMemoryIndexBars?: HistoricalBarInput[]
    ): Promise<BacktestReport> {
        const startTime = new Date();
        const runId = `btr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const symbols = Array.from(new Set(config.symbols.map((s) => s.trim().toUpperCase())));

        const primaryDefinition: DownsideEventDefinition = {
            horizonDays: config.primaryHorizonDays || 5,
            thresholdPercent: config.primaryThresholdPercent || -5.0,
            targetType: 'closing_decline',
            description: `A decline of at least ${Math.abs(config.primaryThresholdPercent || -5.0)}% in daily closing price within the subsequent ${config.primaryHorizonDays || 5} actual trading sessions.`,
        };

        const secondaryDefinition: DownsideEventDefinition = {
            horizonDays: config.secondaryHorizonDays || 10,
            thresholdPercent: config.secondaryThresholdPercent || -8.0,
            targetType: 'closing_decline',
            description: `A decline of at least ${Math.abs(config.secondaryThresholdPercent || -8.0)}% in daily closing price within the subsequent ${config.secondaryHorizonDays || 10} actual trading sessions.`,
        };

        const minWarmup = config.minHistoryWarmupDays ?? 200;
        const targetSeverity = config.signalSeverityThreshold || 'warning';

        const dataQualityWarnings: string[] = [];
        const insufficientHistorySymbols: string[] = [];
        let totalBarsLoaded = 0;
        let totalMissingDates = 0;
        let totalDuplicateDates = 0;

        const allObservations: BacktestObservation[] = [];
        const perSymbolSummaries: BacktestReport['perSymbolSummaries'] = {};

        // 1. Process Benchmark Market Index if available (for baseline comparison)
        const indexBelowSMA200ByDate = new Map<string, boolean>();
        if (inMemoryIndexBars && inMemoryIndexBars.length >= 200) {
            const sortedIndex = [...inMemoryIndexBars].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            for (let i = 200; i < sortedIndex.length; i++) {
                const dateKey = new Date(sortedIndex[i].timestamp).toISOString().split('T')[0];
                const window200 = sortedIndex.slice(i - 199, i + 1).map((b) => b.close);
                const sma = window200.reduce((sum, v) => sum + v, 0) / 200;
                indexBelowSMA200ByDate.set(dateKey, sortedIndex[i].close < sma);
            }
        }

        // 2. Process each requested symbol sequentially
        for (const symbol of symbols) {
            let rawBars: HistoricalBarInput[] = [];

            if (inMemoryBars && inMemoryBars.has(symbol)) {
                rawBars = inMemoryBars.get(symbol)!;
            } else {
                try {
                    const dbBars = await HistoricalBarModel.find({
                        symbol,
                        ...(config.startDate || config.endDate
                            ? {
                                  timestamp: {
                                      ...(config.startDate ? { $gte: new Date(config.startDate) } : {}),
                                      ...(config.endDate ? { $lte: new Date(config.endDate) } : {}),
                                  },
                              }
                            : {}),
                    })
                        .sort({ timestamp: 1 })
                        .lean()
                        .exec();

                    rawBars = dbBars as unknown as HistoricalBarInput[];
                } catch (err: any) {
                    dataQualityWarnings.push(`Failed to load historical bars from database for ${symbol}: ${err.message}`);
                }
            }

            totalBarsLoaded += rawBars.length;

            if (rawBars.length === 0) {
                dataQualityWarnings.push(`No historical price bars found for symbol ${symbol}.`);
                insufficientHistorySymbols.push(symbol);
                continue;
            }

            // Ensure chronological order
            const sortedBars = [...rawBars].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            // Deduplicate observations by date
            const uniqueBars: HistoricalBarInput[] = [];
            const seenDates = new Set<string>();

            for (const bar of sortedBars) {
                const dateStr = new Date(bar.timestamp).toISOString().split('T')[0];
                if (seenDates.has(dateStr)) {
                    totalDuplicateDates++;
                    continue;
                }
                seenDates.add(dateStr);
                uniqueBars.push(bar);
            }

            if (uniqueBars.length < minWarmup + primaryDefinition.horizonDays) {
                insufficientHistorySymbols.push(symbol);
                dataQualityWarnings.push(
                    `Insufficient bar history for ${symbol}: ${uniqueBars.length} bars available, required at least ${minWarmup + primaryDefinition.horizonDays} (warmup + target horizon).`
                );
            }

            const symbolObservations: BacktestObservation[] = [];

            // 3. Rolling assessment simulation across time
            // Assessment date t must have at least minWarmup bars preceding it (including t)
            for (let t = 0; t < uniqueBars.length; t++) {
                const currentBar = uniqueBars[t];
                const dateStr = new Date(currentBar.timestamp).toISOString().split('T')[0];

                // If insufficient historical warmup, mark observation as excluded
                if (t < minWarmup - 1) {
                    symbolObservations.push({
                        symbol,
                        date: dateStr,
                        close: currentBar.close,
                        predictedDownside: false,
                        primaryOutcome: {
                            assessmentDate: dateStr,
                            assessmentClose: currentBar.close,
                            horizonDays: primaryDefinition.horizonDays,
                            futureCloses: [],
                            minFutureClose: currentBar.close,
                            maxDeclinePercent: 0,
                            isDownsideEvent: false,
                            isIncomplete: true,
                            explanation: `Insufficient historical warmup: observation index ${t} < required ${minWarmup}.`,
                        },
                        isEligible: false,
                        exclusionReason: 'insufficient_history',
                    });
                    continue;
                }

                // =============================================================
                // STRICT LOOK-AHEAD BIAS PROTECTION:
                // Slicing observations [0 ... t] ONLY.
                // Absolutely NO bar with index > t enters the feature window.
                // =============================================================
                const historicalFeatureBars = uniqueBars.slice(0, t + 1);

                // Convert strictly historical slice into StockCandlesResult
                const candleSlice: StockCandlesResult = {
                    symbol,
                    close: historicalFeatureBars.map((b) => b.close),
                    high: historicalFeatureBars.map((b) => b.high),
                    low: historicalFeatureBars.map((b) => b.low),
                    open: historicalFeatureBars.map((b) => b.open),
                    volume: historicalFeatureBars.map((b) => b.volume),
                    timestamps: historicalFeatureBars.map((b) => Math.floor(new Date(b.timestamp).getTime() / 1000)),
                    status: 'ok',
                };

                // Execute DownsideRiskEngine strictly on historical daily bars (NO quote parameter)
                const assessment = DownsideRiskEngine.assessDownsideRisk(symbol, symbol, candleSlice);

                // Determine whether engine signaled downside risk on date t
                const severity = assessment.overallRiskSeverity;
                const severityRank: Record<RiskSeverity, number> = { low: 0, advisory: 1, warning: 2, critical: 3 };
                const requiredRank = severityRank[targetSeverity] ?? 2;
                const predictedDownside = severityRank[severity] >= requiredRank;

                // Simple 200 SMA baseline computation on date t
                const closes200 = historicalFeatureBars.slice(Math.max(0, historicalFeatureBars.length - 200)).map((b) => b.close);
                const sma200 = closes200.reduce((a, b) => a + b, 0) / closes200.length;
                const baselinePriceBelowSMA200 = currentBar.close < sma200;

                // =============================================================
                // FUTURE OUTCOME LABELING:
                // Future sessions: bars [t + 1 ... t + 1 + H]
                // =============================================================
                const futureBarsPrimary = uniqueBars.slice(t + 1, t + 1 + primaryDefinition.horizonDays);
                const futureClosesPrimary = futureBarsPrimary.map((b) => b.close);

                const primaryOutcome = PerformanceEvaluator.evaluateOutcome(
                    currentBar.close,
                    futureClosesPrimary,
                    primaryDefinition.horizonDays,
                    primaryDefinition.thresholdPercent,
                    dateStr
                );

                const futureBarsSecondary = uniqueBars.slice(t + 1, t + 1 + secondaryDefinition.horizonDays);
                const futureClosesSecondary = futureBarsSecondary.map((b) => b.close);

                const secondaryOutcome = PerformanceEvaluator.evaluateOutcome(
                    currentBar.close,
                    futureClosesSecondary,
                    secondaryDefinition.horizonDays,
                    secondaryDefinition.thresholdPercent,
                    dateStr
                );

                const isIncomplete = primaryOutcome.isIncomplete;
                const isEligible = !isIncomplete;

                let leadTimeDays: number | undefined;
                if (isEligible && predictedDownside && primaryOutcome.isDownsideEvent) {
                    const lead = PerformanceEvaluator.calculateLeadTimeDays(
                        currentBar.close,
                        futureClosesPrimary,
                        primaryDefinition.horizonDays,
                        primaryDefinition.thresholdPercent
                    );
                    if (lead !== null) leadTimeDays = lead;
                }

                symbolObservations.push({
                    symbol,
                    date: dateStr,
                    close: currentBar.close,
                    riskAssessment: assessment,
                    predictedDownside,
                    primaryOutcome,
                    secondaryOutcome,
                    isEligible,
                    exclusionReason: isIncomplete ? 'incomplete_future_horizon' : undefined,
                    baselinePriceBelowSMA200,
                    baselineMarketIndexContext: indexBelowSMA200ByDate.get(dateStr),
                    leadTimeDays,
                });
            }

            allObservations.push(...symbolObservations);

            // Compute per-symbol metrics
            const eligibleSymbolObs = symbolObservations.filter((o) => o.isEligible);
            const symbolMatrix = PerformanceEvaluator.calculateConfusionMatrix(
                symbolObservations.map((o) => ({
                    predicted: o.predictedDownside,
                    actual: o.primaryOutcome.isDownsideEvent,
                    isEligible: o.isEligible,
                    isIncomplete: o.primaryOutcome.isIncomplete,
                    insufficientHistory: o.exclusionReason === 'insufficient_history',
                }))
            );
            const symbolMetrics = PerformanceEvaluator.calculateMetrics(symbolMatrix);

            perSymbolSummaries[symbol] = {
                totalBars: uniqueBars.length,
                eligibleObservations: eligibleSymbolObs.length,
                signalsTriggered: symbolMatrix.truePositives + symbolMatrix.falsePositives,
                eventsOccurred: symbolMatrix.truePositives + symbolMatrix.falseNegatives,
                precision: symbolMetrics.precision,
                recall: symbolMetrics.recall,
            };
        }

        // 4. Aggregate Confusion Matrix & Metrics for Primary Target
        const primaryEntries = allObservations.map((o) => ({
            predicted: o.predictedDownside,
            actual: o.primaryOutcome.isDownsideEvent,
            isEligible: o.isEligible,
            isIncomplete: o.primaryOutcome.isIncomplete,
            insufficientHistory: o.exclusionReason === 'insufficient_history',
        }));

        const primaryConfusionMatrix = PerformanceEvaluator.calculateConfusionMatrix(primaryEntries);
        const leadTimes = allObservations
            .filter((o) => o.isEligible && o.predictedDownside && o.primaryOutcome.isDownsideEvent && o.leadTimeDays)
            .map((o) => o.leadTimeDays!);

        const primaryMetrics = PerformanceEvaluator.calculateMetrics(
            primaryConfusionMatrix,
            leadTimes,
            252,
            symbols.length || 1
        );

        // 5. Aggregate Confusion Matrix & Metrics for Secondary Target
        const secondaryEntries = allObservations.map((o) => ({
            predicted: o.predictedDownside,
            actual: o.secondaryOutcome?.isDownsideEvent || false,
            isEligible: o.isEligible && !o.secondaryOutcome?.isIncomplete,
            isIncomplete: o.secondaryOutcome?.isIncomplete || false,
            insufficientHistory: o.exclusionReason === 'insufficient_history',
        }));

        const secondaryConfusionMatrix = PerformanceEvaluator.calculateConfusionMatrix(secondaryEntries);
        const secondaryMetrics = PerformanceEvaluator.calculateMetrics(secondaryConfusionMatrix);

        // 6. Aggregate Baselines (strictly on eligible observations)
        const baselineUnconditional = PerformanceEvaluator.evaluateBaselineUnconditional(allObservations);
        const baselineSMA200 = PerformanceEvaluator.evaluateBaselineSMA200(allObservations);
        const baselineIndex = PerformanceEvaluator.evaluateBaselineMarketIndex(allObservations, indexBelowSMA200ByDate);

        // Dates range
        const allDates = allObservations.map((o) => o.date).sort();
        const dateRange = {
            from: allDates[0] || config.startDate || 'N/A',
            to: allDates[allDates.length - 1] || config.endDate || 'N/A',
        };

        const statisticalLimitations = [
            'Rule-Based Heuristic Only: DownsideRiskEngine calculates non-probabilistic indicator breach scores; scores are NOT calibrated probability forecasts.',
            'Overlapping Horizons: Target events evaluate rolling 5-day and 10-day windows; consecutive days are correlated and do NOT represent independent statistical trials.',
            'Survivorship Bias: The tested universe includes only currently listed tickers; delisted and bankrupt equities from earlier periods are absent from this historical sample.',
            'No Unverified Corporate Actions: Free-tier daily candles do not guarantee cash dividend or spin-off adjustments.',
            'Threshold Generalization: Risk thresholds (45% vol, 20% drawdown) were configured a priori in Phase 3; out-of-sample stability requires continuous forward monitoring.',
        ];

        const report: BacktestReport = {
            runId,
            engineVersion: DownsideRiskEngine.VERSION,
            executedAt: startTime.toISOString(),
            config,
            symbolsEvaluated: symbols,
            dateRange,
            totalBarsLoaded,
            dataQualitySummary: {
                missingDatesCount: totalMissingDates,
                duplicateDatesCount: totalDuplicateDates,
                insufficientHistorySymbols,
                warnings: dataQualityWarnings,
            },
            primaryTarget: {
                definition: primaryDefinition,
                confusionMatrix: primaryConfusionMatrix,
                metrics: primaryMetrics,
            },
            secondaryTarget: {
                definition: secondaryDefinition,
                confusionMatrix: secondaryConfusionMatrix,
                metrics: secondaryMetrics,
            },
            baselines: {
                unconditional: baselineUnconditional,
                sma200Breakdown: baselineSMA200,
                marketIndex: baselineIndex,
            },
            perSymbolSummaries,
            statisticalLimitations,
        };

        // 7. Persist Run Metadata if requested
        if (config.persistRun) {
            try {
                await BacktestRunModel.create({
                    runId,
                    engineVersion: DownsideRiskEngine.VERSION,
                    status: 'completed',
                    startTime,
                    endTime: new Date(),
                    symbolsRequested: symbols,
                    symbolsEvaluated: symbols,
                    dateRange,
                    targetDefinitions: {
                        primary: primaryDefinition,
                        secondary: secondaryDefinition,
                    },
                    signalSeverityThreshold: targetSeverity,
                    minHistoryWarmupDays: minWarmup,
                    totalBarsLoaded,
                    observationsSummary: {
                        total: primaryConfusionMatrix.totalObservations,
                        eligible: primaryConfusionMatrix.eligibleObservations,
                        excludedIncompleteHorizon: primaryConfusionMatrix.excludedIncompleteHorizon,
                        excludedInsufficientHistory: primaryConfusionMatrix.excludedInsufficientHistory,
                    },
                    primaryConfusionMatrix: {
                        truePositives: primaryConfusionMatrix.truePositives,
                        falsePositives: primaryConfusionMatrix.falsePositives,
                        trueNegatives: primaryConfusionMatrix.trueNegatives,
                        falseNegatives: primaryConfusionMatrix.falseNegatives,
                    },
                    primaryMetrics: {
                        precision: primaryMetrics.precision,
                        recall: primaryMetrics.recall,
                        specificity: primaryMetrics.specificity,
                        falsePositiveRate: primaryMetrics.falsePositiveRate,
                        eventBaseRate: primaryMetrics.eventBaseRate,
                        f1Score: primaryMetrics.f1Score,
                        alertsPerSymbolPerYear: primaryMetrics.alertsPerSymbolPerYear,
                        medianLeadTimeDays: primaryMetrics.medianLeadTimeDays,
                    },
                    secondaryMetrics: {
                        precision: secondaryMetrics.precision,
                        recall: secondaryMetrics.recall,
                        specificity: secondaryMetrics.specificity,
                        falsePositiveRate: secondaryMetrics.falsePositiveRate,
                        eventBaseRate: secondaryMetrics.eventBaseRate,
                        f1Score: secondaryMetrics.f1Score,
                    },
                    baselines: {
                        unconditional: baselineUnconditional,
                        sma200Breakdown: baselineSMA200,
                        marketIndex: baselineIndex,
                    },
                    perSymbolSummaries,
                    dataQualityWarnings,
                    statisticalLimitations,
                });
            } catch (persistErr: any) {
                console.error(`Warning: Failed to persist backtest run to MongoDB: ${persistErr.message}`);
            }
        }

        return report;
    }
}
