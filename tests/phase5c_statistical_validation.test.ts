import assert from 'assert';
import { StatisticalValidator } from '@/services/backtesting/StatisticalValidator';
import { HistoricalBarInput } from '@/services/backtesting/BacktestEngine';
import { BacktestObservation } from '@/types/backtesting';

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

function generateMockObservations(count: number, positiveRate: number = 0.2): BacktestObservation[] {
    const obs: BacktestObservation[] = [];
    const baseDate = new Date('2023-01-01');

    for (let i = 0; i < count; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const isPositive = i % Math.round(1 / positiveRate) === 0;

        obs.push({
            symbol: 'TEST',
            date: dateStr,
            close: 100,
            predictedDownside: isPositive,
            primaryOutcome: {
                assessmentDate: dateStr,
                assessmentClose: 100,
                horizonDays: 5,
                futureCloses: isPositive ? [94, 95, 96, 97, 98] : [100, 101, 100, 101, 102],
                minFutureClose: isPositive ? 94 : 100,
                maxDeclinePercent: isPositive ? -6 : 0,
                isDownsideEvent: isPositive,
                isIncomplete: false,
                explanation: '',
            },
            isEligible: true,
        });
    }
    return obs;
}

async function main() {
    console.log('\n============================================================');
    console.log('🧪 HyperStocks — Phase 5C Statistical Validation Test Suite');
    console.log('============================================================\n');

    // =========================================================================
    // SUITE 1: WILSON SCORE CONFIDENCE INTERVALS
    // =========================================================================
    console.log('--- Suite 1: Wilson Score Confidence Intervals ---');

    await runTest('Wilson interval computes accurate 95% bounds for standard proportions', () => {
        // 15 successes out of 20 trials (p = 0.75)
        const ci = StatisticalValidator.calculateConfidenceInterval(15, 20, 0.95);
        assert.ok(ci !== null);
        assert.strictEqual(ci.confidenceLevel, 0.95);
        // Theoretical Wilson 95% interval for 15/20: lower ~ 0.5329, upper ~ 0.8881
        assert.ok(ci.lower >= 0.50 && ci.lower <= 0.56, `Expected lower ~ 0.53, got ${ci.lower}`);
        assert.ok(ci.upper >= 0.85 && ci.upper <= 0.92, `Expected upper ~ 0.89, got ${ci.upper}`);
    });

    await runTest('Wilson interval handles zero successes without collapsing to [0, 0]', () => {
        // 0 successes out of 20 trials (p = 0.0)
        const ci = StatisticalValidator.calculateConfidenceInterval(0, 20, 0.95);
        assert.ok(ci !== null);
        assert.strictEqual(ci.lower, 0.0);
        // Upper bound must be strictly positive (Rule of Three ~ 3/20 = 15%)
        assert.ok(ci.upper > 0.10 && ci.upper < 0.20, `Expected upper ~ 0.16, got ${ci.upper}`);
    });

    await runTest('Wilson interval returns null for zero trials', () => {
        const ci = StatisticalValidator.calculateConfidenceInterval(0, 0, 0.95);
        assert.strictEqual(ci, null);
    });

    // =========================================================================
    // SUITE 2: TIME-BLOCK BOOTSTRAP RESAMPLING
    // =========================================================================
    console.log('\n--- Suite 2: Time-Block Bootstrap Resampling ---');

    await runTest('Time-block bootstrap resamples blocks and produces empirical CI', () => {
        const obs = generateMockObservations(60, 0.25); // 60 observations
        const result = StatisticalValidator.timeBlockBootstrap(obs, 5, 100);

        assert.strictEqual(result.iterationsCount, 100);
        assert.ok(result.precisionMean !== null && result.precisionMean > 0);
        assert.ok(result.precisionCI !== null);
        assert.ok(result.precisionCI.lower <= result.precisionCI.upper);
        assert.strictEqual(result.precisionCI.confidenceLevel, 0.95);
    });

    await runTest('Time-block bootstrap returns null when observation count is too small for block partitioning', () => {
        const smallObs = generateMockObservations(10, 0.2); // 10 < blockSize * 4 (20)
        const result = StatisticalValidator.timeBlockBootstrap(smallObs, 5, 100);

        assert.strictEqual(result.iterationsCount, 0);
        assert.strictEqual(result.precisionCI, null);
    });

    // =========================================================================
    // SUITE 3: OUT-OF-SAMPLE (OOS) CHRONOLOGICAL PARTITIONING
    // =========================================================================
    console.log('\n--- Suite 3: Out-Of-Sample (OOS) Partitioning ---');

    await runTest('Out-of-sample split strictly enforces chronological ordering (no overlap)', () => {
        const obs = generateMockObservations(100, 0.2);
        const oos = StatisticalValidator.evaluateOutOfSample(obs, 0.70);

        assert.strictEqual(oos.inSample.eligibleCount, 70);
        assert.strictEqual(oos.outOfSample.eligibleCount, 30);
        assert.ok(oos.inSample.dateRange.to < oos.outOfSample.dateRange.from, 'In-sample dates must precede out-of-sample dates');
    });

    await runTest('Out-of-sample flags small sample sizes as statistically unreliable', () => {
        // 50 observations total => OOS has only 15 observations (< 100 required)
        const smallObs = generateMockObservations(50, 0.2);
        const oos = StatisticalValidator.evaluateOutOfSample(smallObs, 0.70);

        assert.strictEqual(oos.isStatisticallyReliable, false);
        assert.ok(oos.reliabilityAssessment.includes('insufficient for definitive statistical inference'));
    });

    // =========================================================================
    // SUITE 4: DATA READINESS AUDITOR
    // =========================================================================
    console.log('\n--- Suite 4: Data Readiness Auditor ---');

    await runTest('Data readiness auditor detects empty bars and reports deficiency', () => {
        const report = StatisticalValidator.auditDataReadiness('EMPTY', []);
        assert.strictEqual(report.totalBars, 0);
        assert.strictEqual(report.isSufficientForBacktest, false);
        assert.ok(report.deficiencyReason?.includes('Zero historical bars'));
    });

    await runTest('Data readiness auditor flags duplicate dates and invalid OHLC prices', () => {
        const badBars: HistoricalBarInput[] = [
            { symbol: 'BAD', timestamp: '2023-01-01', open: 100, high: 90, low: 110, close: 100, volume: 1000 }, // high < low
            { symbol: 'BAD', timestamp: '2023-01-01', open: 100, high: 105, low: 95, close: 100, volume: -50 }, // duplicate date & negative vol
        ];

        const report = StatisticalValidator.auditDataReadiness('BAD', badBars);
        assert.strictEqual(report.duplicateDatesCount, 1);
        assert.strictEqual(report.invalidOHLCCount, 1);
        assert.strictEqual(report.negativeVolumeCount, 1);
        assert.strictEqual(report.isSufficientForBacktest, false);
    });

    await runTest('Data readiness auditor approves valid 205+ bar series', () => {
        const goodBars: HistoricalBarInput[] = Array.from({ length: 210 }, (_, i) => {
            const d = new Date('2023-01-01');
            d.setDate(d.getDate() + i);
            return {
                symbol: 'GOOD',
                timestamp: d,
                open: 100,
                high: 105,
                low: 95,
                close: 102,
                volume: 500000,
            };
        });

        const report = StatisticalValidator.auditDataReadiness('GOOD', goodBars, 200, 5);
        assert.strictEqual(report.totalBars, 210);
        assert.strictEqual(report.duplicateDatesCount, 0);
        assert.strictEqual(report.invalidOHLCCount, 0);
        assert.strictEqual(report.isSufficientForBacktest, true);
    });

    console.log('\n============================================================');
    console.log(`📊 Automated Test Results: ${passedTests}/${passedTests + failedTests} Passed`);
    console.log('============================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(`Phase 5C Test Execution Failed: ${err.message}`);
    process.exit(1);
});
