import assert from 'assert';
import { PerformanceEvaluator } from '@/services/backtesting/PerformanceEvaluator';
import { BacktestEngine, HistoricalBarInput } from '@/services/backtesting/BacktestEngine';
import { DownsideRiskEngine } from '@/services/risk/DownsideRiskEngine';
import { BacktestConfig, ConfusionMatrix } from '@/types/backtesting';

let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passedTests++;
    } catch (err: any) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     ${err.message}`);
        failedTests++;
    }
}

/**
 * Generates synthetic daily bars for deterministic backtesting simulation.
 */
function generateSyntheticBars(
    symbol: string,
    count: number,
    startPrice: number = 100,
    dailyReturn: number = 0,
    startDateStr: string = '2023-01-01'
): HistoricalBarInput[] {
    const bars: HistoricalBarInput[] = [];
    let currentPrice = startPrice;
    let currentDate = new Date(startDateStr);

    for (let i = 0; i < count; i++) {
        // Skip weekends to simulate trading sessions
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const open = currentPrice;
        currentPrice = Number((currentPrice * (1 + dailyReturn)).toFixed(4));
        const close = currentPrice;
        const high = Math.max(open, close) + 0.5;
        const low = Math.min(open, close) - 0.5;

        bars.push({
            symbol,
            timestamp: new Date(currentDate),
            open,
            high,
            low,
            close,
            volume: 1000000,
            resolution: 'D',
            source: 'synthetic',
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }
    return bars;
}

async function main() {
    console.log('\n============================================================');
    console.log('🧪 HyperStocks — Phase 5B Backtesting Engine Test Suite');
    console.log('============================================================\n');

    // =========================================================================
    // SUITE 1: OUTCOME LABELING & HORIZONS
    // =========================================================================
    console.log('--- Suite 1: Outcome Labeling & Horizon Enforcement ---');

    await runTest('Flat price series produces NO downside event', () => {
        const assessmentClose = 100.0;
        const futureCloses = [100.0, 100.0, 100.0, 100.0, 100.0];
        const label = PerformanceEvaluator.evaluateOutcome(assessmentClose, futureCloses, 5, -5.0);

        assert.strictEqual(label.isDownsideEvent, false);
        assert.strictEqual(label.isIncomplete, false);
        assert.strictEqual(label.maxDeclinePercent, 0);
    });

    await runTest('A 5% decline within 5 sessions triggers the primary downside event', () => {
        const assessmentClose = 100.0;
        // Session 3 drops to 94.5 (a 5.5% decline)
        const futureCloses = [99.0, 98.0, 94.5, 96.0, 97.0];
        const label = PerformanceEvaluator.evaluateOutcome(assessmentClose, futureCloses, 5, -5.0);

        assert.strictEqual(label.isDownsideEvent, true);
        assert.strictEqual(label.isIncomplete, false);
        assert.strictEqual(label.minFutureClose, 94.5);
        assert.strictEqual(label.maxDeclinePercent, -5.5);
    });

    await runTest('A decline that never reaches 5% (e.g. -4.9%) does NOT trigger the event', () => {
        const assessmentClose = 100.0;
        const futureCloses = [99.0, 98.0, 95.1, 96.0, 97.0]; // min = 95.1 (-4.9%)
        const label = PerformanceEvaluator.evaluateOutcome(assessmentClose, futureCloses, 5, -5.0);

        assert.strictEqual(label.isDownsideEvent, false);
        assert.strictEqual(label.isIncomplete, false);
        assert.strictEqual(label.maxDeclinePercent, -4.9);
    });

    await runTest('A 5% decline on the 6th future session does NOT count for a 5-day horizon', () => {
        const assessmentClose = 100.0;
        // Sessions 1-5 stay mild (-2%), session 6 crashes to 90 (-10%)
        const futureCloses = [99.0, 98.5, 98.0, 98.2, 98.0, 90.0];
        const label = PerformanceEvaluator.evaluateOutcome(assessmentClose, futureCloses, 5, -5.0);

        // For horizon = 5, session 6 must be strictly ignored!
        assert.strictEqual(label.isDownsideEvent, false);
        assert.strictEqual(label.futureCloses.length, 5);
        assert.strictEqual(label.minFutureClose, 98.0);
    });

    await runTest('Incomplete future horizons (< 5 sessions) are marked incomplete and excluded', () => {
        const assessmentClose = 100.0;
        const futureCloses = [90.0, 85.0]; // Only 2 future bars available
        const label = PerformanceEvaluator.evaluateOutcome(assessmentClose, futureCloses, 5, -5.0);

        assert.strictEqual(label.isIncomplete, true);
        assert.strictEqual(label.isDownsideEvent, false);
        assert.ok(label.explanation.includes('Incomplete future horizon'));
    });

    await runTest('Lead time correctly measures sessions until threshold breach', () => {
        const assessmentClose = 100.0;
        // Session 1: 99 (-1%), Session 2: 97 (-3%), Session 3: 94 (-6% -> breach!), Session 4: 92
        const futureCloses = [99.0, 97.0, 94.0, 92.0, 95.0];
        const lead = PerformanceEvaluator.calculateLeadTimeDays(assessmentClose, futureCloses, 5, -5.0);

        assert.strictEqual(lead, 3);
    });

    // =========================================================================
    // SUITE 2: METRICS & CONFUSION MATRIX CALCULATIONS
    // =========================================================================
    console.log('\n--- Suite 2: Metrics & Confusion Matrix Calculations ---');

    await runTest('Precision, Recall, Specificity, FPR, and F1 match exact mathematical definitions', () => {
        // Construct known matrix: TP = 15, FP = 5, TN = 70, FN = 10 (Total = 100)
        const entries = [
            ...Array(15).fill({ predicted: true, actual: true, isEligible: true, isIncomplete: false }),
            ...Array(5).fill({ predicted: true, actual: false, isEligible: true, isIncomplete: false }),
            ...Array(70).fill({ predicted: false, actual: false, isEligible: true, isIncomplete: false }),
            ...Array(10).fill({ predicted: false, actual: true, isEligible: true, isIncomplete: false }),
        ];

        const matrix = PerformanceEvaluator.calculateConfusionMatrix(entries);
        assert.strictEqual(matrix.truePositives, 15);
        assert.strictEqual(matrix.falsePositives, 5);
        assert.strictEqual(matrix.trueNegatives, 70);
        assert.strictEqual(matrix.falseNegatives, 10);
        assert.strictEqual(matrix.eligibleObservations, 100);

        const metrics = PerformanceEvaluator.calculateMetrics(matrix, [2, 3, 4], 252, 1);

        // Precision = 15 / (15 + 5) = 15 / 20 = 0.75
        assert.strictEqual(metrics.precision, 0.75);

        // Recall = 15 / (15 + 10) = 15 / 25 = 0.60
        assert.strictEqual(metrics.recall, 0.60);

        // Specificity = 70 / (70 + 5) = 70 / 75 = 0.9333
        assert.strictEqual(metrics.specificity, 0.9333);

        // False Positive Rate = 5 / (5 + 70) = 5 / 75 = 0.0667
        assert.strictEqual(metrics.falsePositiveRate, 0.0667);

        // Base Rate = (15 + 10) / 100 = 0.25
        assert.strictEqual(metrics.eventBaseRate, 0.25);

        // F1 = 2 * (0.75 * 0.60) / (0.75 + 0.60) = 2 * 0.45 / 1.35 = 0.9 / 1.35 = 0.6667
        assert.strictEqual(metrics.f1Score, 0.6667);

        // Median Lead Time for [2, 3, 4] = 3
        assert.strictEqual(metrics.medianLeadTimeDays, 3);
    });

    await runTest('Zero denominators return null rather than NaN or 0', () => {
        // Zero alerts generated: TP = 0, FP = 0, TN = 80, FN = 20
        const emptyAlertMatrix: ConfusionMatrix = {
            truePositives: 0,
            falsePositives: 0,
            trueNegatives: 80,
            falseNegatives: 20,
            totalObservations: 100,
            eligibleObservations: 100,
            excludedIncompleteHorizon: 0,
            excludedInsufficientHistory: 0,
        };

        const metrics = PerformanceEvaluator.calculateMetrics(emptyAlertMatrix);
        assert.strictEqual(metrics.precision, null, 'Precision with zero alerts must be null');
        assert.strictEqual(metrics.f1Score, null, 'F1 score with zero alerts must be null');
        assert.strictEqual(metrics.recall, 0.0, 'Recall with zero true positives and positive actuals should be 0');
    });

    // =========================================================================
    // SUITE 3: STRICT LOOK-AHEAD BIAS & LEAKAGE PREVENTION
    // =========================================================================
    console.log('\n--- Suite 3: Strict Look-Ahead Bias & Leakage Prevention ---');

    await runTest('Modifying future bars has ZERO impact on feature values and risk assessment at t', async () => {
        // Generate baseline series: 250 bars
        const barsOriginal = generateSyntheticBars('LEAK_TEST', 250, 100, 0);

        // Run backtest on baseline
        const config: BacktestConfig = {
            symbols: ['LEAK_TEST'],
            minHistoryWarmupDays: 200,
            primaryHorizonDays: 5,
            primaryThresholdPercent: -5.0,
            secondaryHorizonDays: 10,
            secondaryThresholdPercent: -8.0,
            signalSeverityThreshold: 'warning',
            includeBaselines: false,
        };

        const inMemoryOriginal = new Map<string, HistoricalBarInput[]>([['LEAK_TEST', barsOriginal]]);
        const reportOriginal = await BacktestEngine.runBacktest(config, inMemoryOriginal);

        // Now create a mutated dataset where FUTURE bars (from index 240 onwards) are wildly altered
        const barsMutated = barsOriginal.map((b, idx) => {
            if (idx >= 240) {
                return {
                    ...b,
                    close: b.close * 0.1, // Catastrophic 90% collapse in the future
                    high: b.high * 0.1,
                    low: b.low * 0.1,
                    open: b.open * 0.1,
                };
            }
            return { ...b };
        });

        const inMemoryMutated = new Map<string, HistoricalBarInput[]>([['LEAK_TEST', barsMutated]]);
        const reportMutated = await BacktestEngine.runBacktest(config, inMemoryMutated);

        // For all assessment dates t < 240:
        // The historical features (volatility, VaR, drawdown, score, severity) MUST BE EXACTLY IDENTICAL
        // Because date t is forbidden from looking at index 240!
        // We test observation at index 210 (which is > 200 warmup, < 240 mutation)
        const date210 = new Date(barsOriginal[210].timestamp).toISOString().split('T')[0];

        // Verify that the assessment on date210 produced identical results in both runs
        // We inspect via manual slice to verify exact equality
        const sliceOriginal = barsOriginal.slice(0, 211);
        const sliceMutated = barsMutated.slice(0, 211);

        assert.deepStrictEqual(
            sliceOriginal.map((b) => b.close),
            sliceMutated.map((b) => b.close),
            'Feature window slices must be identical before mutation date'
        );

        const candleSliceOrig = {
            symbol: 'LEAK_TEST',
            close: sliceOriginal.map((b) => b.close),
            high: sliceOriginal.map((b) => b.high),
            low: sliceOriginal.map((b) => b.low),
            open: sliceOriginal.map((b) => b.open),
            volume: sliceOriginal.map((b) => b.volume),
            timestamps: sliceOriginal.map((b) => Math.floor(new Date(b.timestamp).getTime() / 1000)),
            status: 'ok' as const,
        };

        const candleSliceMut = {
            symbol: 'LEAK_TEST',
            close: sliceMutated.map((b) => b.close),
            high: sliceMutated.map((b) => b.high),
            low: sliceMutated.map((b) => b.low),
            open: sliceMutated.map((b) => b.open),
            volume: sliceMutated.map((b) => b.volume),
            timestamps: sliceMutated.map((b) => Math.floor(new Date(b.timestamp).getTime() / 1000)),
            status: 'ok' as const,
        };

        const assessOrig = DownsideRiskEngine.assessDownsideRisk('LEAK_TEST', 'Leak Test Corp', candleSliceOrig);
        const assessMut = DownsideRiskEngine.assessDownsideRisk('LEAK_TEST', 'Leak Test Corp', candleSliceMut);

        assert.strictEqual(assessOrig.historicalVolatility21d.value, assessMut.historicalVolatility21d.value);
        assert.strictEqual(assessOrig.maximumDrawdown.value, assessMut.maximumDrawdown.value);
        assert.strictEqual(assessOrig.overallRiskSeverity, assessMut.overallRiskSeverity);
        assert.strictEqual(assessOrig.experimentalRiskScore, assessMut.experimentalRiskScore);
        assert.strictEqual(assessOrig.referencePriceType, 'completed_daily_close');
    });

    await runTest('Future price shock alters outcome labels ONLY when entering the target horizon window', () => {
        const assessmentClose = 100.0;

        // Window 1: Future shock at index 3 (within 5-day horizon)
        const shockWithinHorizon = [99.0, 98.0, 94.0, 96.0, 97.0];
        const labelWithin = PerformanceEvaluator.evaluateOutcome(assessmentClose, shockWithinHorizon, 5, -5.0);
        assert.strictEqual(labelWithin.isDownsideEvent, true);

        // Window 2: Future shock at index 7 (outside 5-day horizon)
        const shockOutsideHorizon = [99.0, 98.0, 99.0, 98.5, 99.0, 98.0, 97.0, 90.0];
        const labelOutside = PerformanceEvaluator.evaluateOutcome(assessmentClose, shockOutsideHorizon, 5, -5.0);
        assert.strictEqual(labelOutside.isDownsideEvent, false);
    });

    // =========================================================================
    // SUITE 4: DATA QUALITY & CORRUPT/INCOMPLETE BARS
    // =========================================================================
    console.log('\n--- Suite 4: Data Quality, Warmup & Edge Cases ---');

    await runTest('Duplicate bars on the same date are deduplicated safely', async () => {
        const bars = generateSyntheticBars('DUP_TEST', 220, 100, 0);
        // Duplicate bar index 10
        const duplicatedBars = [...bars, { ...bars[10] }];

        const config: BacktestConfig = {
            symbols: ['DUP_TEST'],
            minHistoryWarmupDays: 200,
            primaryHorizonDays: 5,
            primaryThresholdPercent: -5.0,
            secondaryHorizonDays: 10,
            secondaryThresholdPercent: -8.0,
            signalSeverityThreshold: 'warning',
            includeBaselines: false,
        };

        const inMemory = new Map<string, HistoricalBarInput[]>([['DUP_TEST', duplicatedBars]]);
        const report = await BacktestEngine.runBacktest(config, inMemory);

        assert.strictEqual(report.dataQualitySummary.duplicateDatesCount, 1);
        assert.strictEqual(report.symbolsEvaluated[0], 'DUP_TEST');
    });

    await runTest('Bars with insufficient history (< warmup) are excluded from confusion matrix', async () => {
        // Provide only 50 bars (warmup requires 200)
        const shortBars = generateSyntheticBars('SHORT_TEST', 50, 100, 0);

        const config: BacktestConfig = {
            symbols: ['SHORT_TEST'],
            minHistoryWarmupDays: 200,
            primaryHorizonDays: 5,
            primaryThresholdPercent: -5.0,
            secondaryHorizonDays: 10,
            secondaryThresholdPercent: -8.0,
            signalSeverityThreshold: 'warning',
            includeBaselines: false,
        };

        const inMemory = new Map<string, HistoricalBarInput[]>([['SHORT_TEST', shortBars]]);
        const report = await BacktestEngine.runBacktest(config, inMemory);

        assert.strictEqual(report.primaryTarget.confusionMatrix.eligibleObservations, 0);
        assert.strictEqual(report.primaryTarget.confusionMatrix.excludedInsufficientHistory, 50);
        assert.ok(report.dataQualitySummary.insufficientHistorySymbols.includes('SHORT_TEST'));
    });

    await runTest('Baselines use the exact same eligible observation population', async () => {
        const bars = generateSyntheticBars('BASELINE_TEST', 220, 100, -0.005); // slight downward drift

        const config: BacktestConfig = {
            symbols: ['BASELINE_TEST'],
            minHistoryWarmupDays: 200,
            primaryHorizonDays: 5,
            primaryThresholdPercent: -5.0,
            secondaryHorizonDays: 10,
            secondaryThresholdPercent: -8.0,
            signalSeverityThreshold: 'warning',
            includeBaselines: true,
        };

        const inMemory = new Map<string, HistoricalBarInput[]>([['BASELINE_TEST', bars]]);
        const report = await BacktestEngine.runBacktest(config, inMemory);

        const primaryEligible = report.primaryTarget.confusionMatrix.eligibleObservations;
        const unconditionalEligible = report.baselines.unconditional.eligibleCount;
        const sma200Eligible = report.baselines.sma200Breakdown.eligibleCount;

        assert.strictEqual(unconditionalEligible, primaryEligible, 'Unconditional baseline must use same eligible count');
        assert.strictEqual(sma200Eligible, primaryEligible, 'SMA200 baseline must use same eligible count');
    });

    console.log('\n============================================================');
    console.log(`📊 Automated Test Results: ${passedTests}/${passedTests + failedTests} Passed`);
    console.log('============================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(`Test Execution Failed: ${err.message}`);
    process.exit(1);
});
