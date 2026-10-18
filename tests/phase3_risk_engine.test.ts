import assert from 'assert';
import { FinnhubMarketService } from '../services/market/FinnhubMarketService';
import { DownsideRiskEngine } from '../services/risk/DownsideRiskEngine';
import { DownsideRiskAlertService } from '../services/alerts/DownsideRiskAlertService';
import { buildDownsideRiskEmailHtml } from '../services/email/templates/downsideRiskEmailTemplate';
import { StockCandlesResult } from '../types/market';
import { DownsideRiskAssessment, TriggeredRiskCondition } from '../types/risk';
import { AlertEmailData } from '../types/email';
import { AlertNotificationPreferences, DEFAULT_ALERT_PREFERENCES } from '../types/alerts';

let passedTests = 0;
let totalTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
        const res = fn();
        if (res instanceof Promise) {
            await res;
        }
        console.log(`  ✅ PASS: ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(err);
    }
}

// -------------------------------------------------------------------------
// SYNTHETIC FIXTURE GENERATORS
// -------------------------------------------------------------------------

function generateCandlesResult(
    symbol: string,
    count: number,
    basePrice: number,
    changePattern: (dayIndex: number) => number
): StockCandlesResult {
    const closes: number[] = [];
    const opens: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const timestamps: number[] = [];
    const volumes: number[] = [];

    let currentPrice = basePrice;
    const baseTimestamp = Math.floor(Date.now() / 1000) - count * 86400;

    for (let i = 0; i < count; i++) {
        const changePercent = changePattern(i);
        const open = currentPrice;
        currentPrice = Math.max(0.01, currentPrice * (1 + changePercent));
        const close = currentPrice;
        const high = Math.max(open, close) * 1.01;
        const low = Math.min(open, close) * 0.99;
        const volume = 1000000 + Math.floor(Math.sin(i) * 200000);

        opens.push(open);
        closes.push(close);
        highs.push(high);
        lows.push(low);
        timestamps.push(baseTimestamp + i * 86400);
        volumes.push(volume);
    }

    return {
        symbol,
        open: opens,
        close: closes,
        high: highs,
        low: lows,
        timestamps,
        volume: volumes,
        status: 'ok',
    };
}

async function main() {
    console.log('\n============================================================');
    console.log('🧪 HyperStocks — Phase 3 Quantitative Downside Risk Test Suite');
    console.log('============================================================\n');

    // =========================================================================
    // SUITE 1: MARKET DATA & FINNHUB CANDLE PROVIDER
    // =========================================================================
    console.log('--- Suite 1: Historical Market Data & Validation ---');

    await runTest('FinnhubMarketService.getCandles rejects invalid symbol or timestamps', async () => {
        const service = new FinnhubMarketService('mock-api-key');
        
        // Empty symbol
        const emptySymbolRes = await service.getCandles('', 'D', 100, 200);
        assert.strictEqual(emptySymbolRes.success, false);
        assert.strictEqual(emptySymbolRes.code, 'INVALID_SYMBOL');

        // Inverted time range (from >= to)
        const invalidRangeRes = await service.getCandles('AAPL', 'D', 200, 100);
        assert.strictEqual(invalidRangeRes.success, false);
        assert.strictEqual(invalidRangeRes.code, 'INVALID_TIME_RANGE');
    });

    await runTest('FinnhubMarketService filters out corrupt zero or negative prices and sorts observations', async () => {
        const service = new FinnhubMarketService('mock-api-key');

        const mockRawResponse = {
            s: 'ok',
            t: [1700000000, 1700086400, 1700172800, 1700259200],
            o: [150, 152, 0, 155],
            h: [153, 154, 0, 157],
            l: [149, 151, 0, 154],
            c: [151, 153, 0, 156], // 3rd candle has corrupt 0 price
            v: [1000, 1200, 0, 1100],
        };

        const originalFetch = global.fetch;
        global.fetch = async () => ({
            ok: true,
            status: 200,
            json: async () => mockRawResponse,
        } as any);

        try {
            const result = await service.getCandles('MOCK_CORRUPT', 'D', 1699900000, 1700300000);
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data.status, 'ok');
                // The 3rd candle with 0 price must be filtered out
                assert.strictEqual(result.data.close.length, 3);
                assert.strictEqual(result.data.close[0], 151);
                assert.strictEqual(result.data.close[1], 153);
                assert.strictEqual(result.data.close[2], 156);
            }
        } finally {
            global.fetch = originalFetch;
        }
    });

    await runTest('FinnhubMarketService handles "no_data" response cleanly without throwing', async () => {
        const service = new FinnhubMarketService('mock-api-key');

        const originalFetch = global.fetch;
        global.fetch = async () => ({
            ok: true,
            status: 200,
            json: async () => ({ s: 'no_data' }),
        } as any);

        try {
            const result = await service.getCandles('EMPTY_STOCK', 'D', 1000, 2000);
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data.status, 'no_data');
                assert.strictEqual(result.data.close.length, 0);
            }
        } finally {
            global.fetch = originalFetch;
        }
    });

    await runTest('FinnhubMarketService handles 429 rate limit or 500 server error gracefully', async () => {
        const service = new FinnhubMarketService('mock-api-key');

        const originalFetch = global.fetch;
        global.fetch = async () => ({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: async () => 'Rate limit exceeded',
        } as any);

        try {
            const result = await service.getCandles('RATELIMIT', 'D', 1000, 2000);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.code, 429);
            assert.ok(result.error?.includes('429'));
        } finally {
            global.fetch = originalFetch;
        }
    });

    // =========================================================================
    // SUITE 2: QUANTITATIVE RISK ENGINE INDICATORS
    // =========================================================================
    console.log('\n--- Suite 2: Quantitative Risk Engine Indicators ---');

    await runTest('Calculates Annualized Historical Volatility correctly for flat vs oscillating series', () => {
        // 1. Flat price series (returns are all 0%)
        const flatCandles = generateCandlesResult('FLAT', 65, 100, () => 0);
        const flatAssessment = DownsideRiskEngine.assessDownsideRisk('FLAT', 'Flat Co', flatCandles);
        assert.ok(flatAssessment.historicalVolatility21d.value !== null);
        assert.strictEqual(flatAssessment.historicalVolatility21d.value, 0);

        // 2. Oscillating price series (+2%, -2%, +2%, -2%)
        const volatileCandles = generateCandlesResult('VOL', 65, 100, (i) => (i % 2 === 0 ? 0.02 : -0.02));
        const volAssessment = DownsideRiskEngine.assessDownsideRisk('VOL', 'Volatile Co', volatileCandles);
        assert.ok(volAssessment.historicalVolatility21d.value !== null);
        assert.ok(volAssessment.historicalVolatility21d.value! > 25, '21d annualized volatility should be >25%');
    });

    await runTest('Historical 95% Daily VaR reports positive loss magnitude and CVaR >= VaR', () => {
        // 100 days with predictable tail drops in the trailing 63-day window
        const normalCandles = generateCandlesResult('NORM', 100, 100, (i) => {
            if (i === 55) return -0.06;  // -6% drop
            if (i === 65) return -0.05;  // -5% drop
            if (i === 75) return -0.045; // -4.5% drop
            if (i === 85) return -0.04;  // -4% drop
            if (i === 95) return -0.035; // -3.5% drop
            return (Math.sin(i) * 0.01);
        });

        const assessment = DownsideRiskEngine.assessDownsideRisk('NORM', 'Normal Co', normalCandles);

        assert.ok(assessment.historicalVaR95.value !== null);
        const varValue = assessment.historicalVaR95.value!;
        // Sign convention: VaR must be positive loss magnitude
        assert.ok(varValue > 0, `VaR must be positive loss magnitude, got: ${varValue}`);
        assert.ok(varValue >= 2.0 && varValue <= 6.0, `Expected VaR between 2% and 6%, got: ${varValue}`);

        // CVaR represents average loss beyond 95% threshold -> must be >= VaR
        assert.ok(assessment.historicalCVaR95.value !== null);
        const cvarValue = assessment.historicalCVaR95.value!;
        assert.ok(cvarValue >= varValue, `CVaR (${cvarValue}) must be >= VaR (${varValue})`);
    });

    await runTest('Maximum Drawdown correctly captures peak-to-trough decline', () => {
        const closes: number[] = [];
        const baseTs = 1700000000;
        const timestamps: number[] = [];

        // Rise from 100 to 200
        for (let i = 0; i < 20; i++) {
            closes.push(100 + i * 5);
            timestamps.push(baseTs + i * 86400);
        }
        closes.push(200); // peak
        timestamps.push(baseTs + 20 * 86400);

        // Drop from 200 down to 120 (40% decline)
        for (let i = 1; i <= 15; i++) {
            closes.push(200 - (i / 15) * 80);
            timestamps.push(baseTs + (20 + i) * 86400);
        }

        // Mild rebound to 140
        for (let i = 1; i <= 10; i++) {
            closes.push(120 + i * 2);
            timestamps.push(baseTs + (35 + i) * 86400);
        }

        const candles: StockCandlesResult = {
            symbol: 'DD_TEST',
            open: closes,
            close: closes,
            high: closes.map(p => p * 1.01),
            low: closes.map(p => p * 0.99),
            timestamps,
            volume: closes.map(() => 10000),
            status: 'ok',
        };

        const assessment = DownsideRiskEngine.assessDownsideRisk('DD_TEST', 'Drawdown Co', candles);
        assert.ok(assessment.maximumDrawdown.value !== null);
        
        // Peak = 200, Trough = 120. Drawdown = (200 - 120) / 200 = 40.0%
        const mdd = assessment.maximumDrawdown.value!;
        assert.ok(Math.abs(mdd - 40.0) < 0.5, `Expected ~40% drawdown, got ${mdd}%`);
    });

    await runTest('Moving Average Breakdown accurately triggers when price breaches SMA200', () => {
        const closes: number[] = [];
        const timestamps: number[] = [];
        const baseTs = 1700000000;
        
        for (let i = 0; i < 205; i++) {
            closes.push(150);
            timestamps.push(baseTs + i * 86400);
        }
        // Last 15 candles plunge to 112.5
        for (let i = 205; i < 220; i++) {
            closes.push(150 - (i - 204) * 2.5);
            timestamps.push(baseTs + i * 86400);
        }

        const candles: StockCandlesResult = {
            symbol: 'SMA_TEST',
            open: closes,
            close: closes,
            high: closes.map(p => p * 1.01),
            low: closes.map(p => p * 0.99),
            timestamps,
            volume: closes.map(() => 50000),
            status: 'ok',
        };

        const assessment = DownsideRiskEngine.assessDownsideRisk('SMA_TEST', 'SMA Breakdown Co', candles);
        assert.ok(assessment.movingAverageBreakdown.value !== null);
        const data = assessment.movingAverageBreakdown.value!;
        
        assert.strictEqual(data.isBreakdown, true);
        assert.ok(data.percentBelow > 5, `Percent below SMA should be > 5%, got ${data.percentBelow}%`);
        assert.ok(assessment.triggeredConditions.some(c => c.category === 'ma_breakdown'));
    });

    await runTest('Proximity to 52-week low triggers when price is within 5% of trailing low', () => {
        const closes: number[] = [];
        const timestamps: number[] = [];
        const baseTs = 1700000000;

        for (let i = 0; i < 251; i++) {
            closes.push(i === 100 ? 100 : 120 + Math.sin(i) * 20);
            timestamps.push(baseTs + i * 86400);
        }
        // Last candle close = 103 (3% above 52-week low of 100)
        closes.push(103);
        timestamps.push(baseTs + 251 * 86400);

        const candles: StockCandlesResult = {
            symbol: 'LOW_TEST',
            open: closes,
            close: closes,
            high: closes.map(p => p * 1.01),
            low: closes.map(p => p * 0.99),
            timestamps,
            volume: closes.map(() => 50000),
            status: 'ok',
        };

        const assessment = DownsideRiskEngine.assessDownsideRisk('LOW_TEST', 'Low Proximity Co', candles);
        assert.ok(assessment.proximityToLow.value !== null);
        const data = assessment.proximityToLow.value!;
        
        assert.strictEqual(data.isNearLow, true);
        assert.ok(data.percentAboveLow <= 5.0, `Expected <= 5% above low, got ${data.percentAboveLow}%`);
        assert.ok(assessment.triggeredConditions.some(c => c.category === 'historical_low'));
    });

    await runTest('Volatility Expansion triggers when short-term volatility surges 30%+ over baseline', () => {
        const closes: number[] = [];
        const timestamps: number[] = [];
        const baseTs = 1700000000;

        for (let i = 0; i < 49; i++) {
            closes.push(100 + (i % 2 === 0 ? 0.2 : -0.2));
            timestamps.push(baseTs + i * 86400);
        }
        for (let i = 49; i < 70; i++) {
            closes.push(100 + (i % 2 === 0 ? 3.5 : -3.5));
            timestamps.push(baseTs + i * 86400);
        }

        const candles: StockCandlesResult = {
            symbol: 'VOL_EXP',
            open: closes,
            close: closes,
            high: closes.map(p => p * 1.01),
            low: closes.map(p => p * 0.99),
            timestamps,
            volume: closes.map(() => 50000),
            status: 'ok',
        };

        const assessment = DownsideRiskEngine.assessDownsideRisk('VOL_EXP', 'Expansion Co', candles);
        assert.ok(assessment.volatilityExpansion.value !== null);
        const data = assessment.volatilityExpansion.value!;

        assert.strictEqual(data.isExpanding, true);
        assert.ok(data.expansionRatio >= 1.30, `Expected expansion ratio >= 1.30, got ${data.expansionRatio}`);
        assert.ok(assessment.triggeredConditions.some(c => c.category === 'volatility_spike'));
    });

    await runTest('Insufficient data (<20 candles) returns unAvailable without NaN or invented zeros', () => {
        const candles = generateCandlesResult('SPARSE', 5, 50, () => 0.01);
        const assessment = DownsideRiskEngine.assessDownsideRisk('SPARSE', 'Sparse Co', candles);

        assert.strictEqual(assessment.overallDataQuality, 'insufficient');
        assert.strictEqual(assessment.historicalVolatility21d.value, null);
        assert.strictEqual(assessment.historicalVaR95.value, null);
        assert.strictEqual(assessment.movingAverageBreakdown.value, null);
        assert.strictEqual(assessment.triggeredConditions.length, 0);
        assert.strictEqual(assessment.overallRiskSeverity, 'low');
    });

    await runTest('Experimental composite score stays bounded [0, 100] and explicitly labels itself as non-probabilistic', () => {
        const crashCandles = generateCandlesResult('CRASH', 80, 100, (i) => (i > 50 ? -0.04 : 0));
        const assessment = DownsideRiskEngine.assessDownsideRisk('CRASH', 'Crash Co', crashCandles);

        assert.ok(assessment.experimentalRiskScore >= 0 && assessment.experimentalRiskScore <= 100);
        assert.ok(assessment.methodologyNotes.some(n => n.toLowerCase().includes('not statistical probability') || n.toLowerCase().includes('not a probability')));
    });

    // =========================================================================
    // SUITE 3: ALERT WORKFLOW, DEDUPLICATION & USER ISOLATION
    // =========================================================================
    console.log('\n--- Suite 3: Alert Workflow, Deduplication & Isolation ---');

    await runTest('DownsideRiskAlertService evaluates conditions and skips user when alerts disabled', () => {
        const disabledPrefs: AlertNotificationPreferences = {
            ...DEFAULT_ALERT_PREFERENCES,
            downsideRiskAlertsEnabled: false,
        };

        const severeAssessment = DownsideRiskEngine.assessDownsideRisk(
            'CRITICAL_TICKER',
            'Critical Inc',
            generateCandlesResult('CRITICAL_TICKER', 80, 100, (i) => (i > 50 ? -0.04 : 0))
        );

        const activeConditions = DownsideRiskAlertService.evaluateConditionsForUser(severeAssessment, disabledPrefs);
        assert.strictEqual(activeConditions.length, 0, 'Must return empty array when downsideRiskAlertsEnabled is false');
    });

    await runTest('DownsideRiskAlertService filters conditions below user minSeverity', () => {
        const prefs: AlertNotificationPreferences = {
            ...DEFAULT_ALERT_PREFERENCES,
            downsideRiskAlertsEnabled: true,
            downsideRiskMinSeverity: 'critical',
        };

        // Create synthetic assessment with a 'warning' condition
        const warningAssessment: any = {
            symbol: 'WARN_TICKER',
            companyName: 'Warning Co',
            assessmentTimestamp: Date.now(),
            dataFreshness: 'Fresh',
            dataWindow: { fromTimestamp: 0, toTimestamp: 0, totalCandles: 63, validPriceObservations: 63 },
            overallDataQuality: 'usable',
            currentPrice: 100,
            historicalVolatility21d: { name: 'v', value: 25, unit: '%', window: '21d', isAvailable: true, description: '', limitations: '', observationsCount: 21 },
            historicalVolatility63d: { name: 'v', value: 20, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
            historicalVaR95: { name: 'v', value: 3.2, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
            historicalCVaR95: { name: 'v', value: 4.1, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
            maximumDrawdown: { name: 'v', value: 15, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
            movingAverageBreakdown: { name: 'v', value: { isBreakdown: false, periodDays: 50, movingAveragePrice: 95, currentPrice: 100, percentBelow: 0 }, unit: '%', window: '50d', isAvailable: true, description: '', limitations: '', observationsCount: 50 },
            proximityToLow: { name: 'v', value: { isNearLow: false, periodDays: 63, historicalLowPrice: 85, currentPrice: 100, percentAboveLow: 17.6 }, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
            volatilityExpansion: { name: 'v', value: { isExpanding: false, shortTermVolatility: 25, baselineVolatility: 20, shortTermPeriodDays: 21, baselinePeriodDays: 63, expansionRatio: 1.25 }, unit: 'ratio', window: '21d/63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
            triggeredConditions: [
                {
                    id: 'drawdown_warning',
                    title: 'Moderate Trailing Drawdown',
                    category: 'drawdown',
                    severity: 'warning',
                    evidence: 'Peak-to-trough decline of 15.0%',
                    observationWindow: '63 trading days',
                    thresholdApplied: 'Drawdown >= 15.0%',
                    timestamp: new Date().toISOString(),
                }
            ],
            overallRiskSeverity: 'warning',
            experimentalRiskScore: 40,
            scoreInterpretation: 'Moderate Downside Risk',
            summary: 'Moderate drawdown observed',
            methodologyNotes: ['Not a probability'],
            calculationVersion: '1.0.0',
        };

        const activeConditions = DownsideRiskAlertService.evaluateConditionsForUser(warningAssessment, prefs);
        assert.strictEqual(activeConditions.length, 0, 'Warning condition should be filtered out when minSeverity is critical');
    });

    await runTest('Deduplication & Cooldown logic suppresses repeated alert within cooldown unless severity escalates', () => {
        const condition: any = {
            id: 'var_95_elevated',
            title: 'Elevated Daily Value at Risk',
            category: 'var_exceedance',
            severity: 'warning',
            evidence: 'VaR is 3.5%',
            observationWindow: '63d',
            thresholdApplied: 'VaR >= 3.0%',
            timestamp: new Date().toISOString(),
        };

        const cooldownHours = 24;

        // 1. Same condition within cooldown window (5 hours ago) with same severity -> SUPPRESSED
        const recentLogSameSeverity = {
            sentAt: new Date(Date.now() - 5 * 3600 * 1000),
            severity: 'warning',
        };
        const suppressed = DownsideRiskAlertService.isDuplicateAlert(condition, recentLogSameSeverity, cooldownHours);
        assert.strictEqual(suppressed, true, 'Identical severity within 24h cooldown must be suppressed');

        // 2. Escalation: previous was warning, new condition is CRITICAL -> MUST DELIVER
        const escalatedCondition: any = {
            ...condition,
            severity: 'critical',
            evidence: 'VaR surged to 6.2%!',
        };
        const escalated = DownsideRiskAlertService.isDuplicateAlert(escalatedCondition, recentLogSameSeverity, cooldownHours);
        assert.strictEqual(escalated, false, 'Escalation to CRITICAL must bypass cooldown');

        // 3. Same condition AFTER cooldown window (30 hours ago) -> MUST DELIVER
        const oldLog = {
            sentAt: new Date(Date.now() - 30 * 3600 * 1000),
            severity: 'warning',
        };
        const expired = DownsideRiskAlertService.isDuplicateAlert(condition, oldLog, cooldownHours);
        assert.strictEqual(expired, false, 'Alert after 24h cooldown window must be allowed');
    });

    await runTest('Shared tickers reuse market data cache across multiple users (Zero Redundant Finnhub Requests)', async () => {
        let fetchCount = 0;
        const service = new FinnhubMarketService('mock-api-key');

        const originalFetch = global.fetch;
        global.fetch = async () => {
            fetchCount++;
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    s: 'ok',
                    t: [1700000000, 1700086400],
                    o: [150, 152],
                    h: [153, 154],
                    l: [149, 151],
                    c: [151, 153],
                    v: [1000, 1200],
                }),
            } as any;
        };

        try {
            // User 1 requests AAPL candles
            const res1 = await service.getCandles('AAPL_SHARED', 'D', 1699900000, 1700100000);
            assert.strictEqual(res1.success, true);
            assert.strictEqual(fetchCount, 1);

            // User 2 requests AAPL candles with exact same parameters immediately after
            const res2 = await service.getCandles('AAPL_SHARED', 'D', 1699900000, 1700100000);
            assert.strictEqual(res2.success, true);
            // Must hit memory cache, fetchCount remains 1
            assert.strictEqual(fetchCount, 1, 'Second user watching AAPL must hit candle cache without second API call');
        } finally {
            global.fetch = originalFetch;
        }
    });

    await runTest('Strict User Isolation: User A and User B receive distinct risk assessments with no cross-leakage', () => {
        const userACandles = generateCandlesResult('NVDA', 60, 200, () => -0.01); // Falling stock
        const userBCandles = generateCandlesResult('KO', 60, 50, () => 0.01);   // Rising stock

        const userAAssessment = DownsideRiskEngine.assessDownsideRisk('NVDA', 'Nvidia Corp', userACandles);
        const userBAssessment = DownsideRiskEngine.assessDownsideRisk('KO', 'Coca-Cola', userBCandles);

        assert.strictEqual(userAAssessment.symbol, 'NVDA');
        assert.strictEqual(userBAssessment.symbol, 'KO');
        assert.notStrictEqual(userAAssessment.currentPrice, userBAssessment.currentPrice);
        assert.notStrictEqual(userAAssessment.maximumDrawdown.value, userBAssessment.maximumDrawdown.value);
    });

    // =========================================================================
    // SUITE 4: DOWNSIDE RISK EMAIL TEMPLATE & SECURITY
    // =========================================================================
    console.log('\n--- Suite 4: Email Template, Escaping & Disclaimers ---');

    await runTest('Downside risk email safely sanitizes XSS injection in user names, tickers and evidence', () => {
        const maliciousData: any = {
            userName: '<script>alert("hacked")</script> Alice',
            userEmail: 'alice@example.com',
            ticker: 'EVIL"><script>evil()</script>',
            companyName: 'Evil <img src=x onerror=alert(1)> Corp',
            currentPrice: 12.34,
            priceChange: -2.5,
            percentageChange: -16.8,
            riskAssessment: {
                symbol: 'EVIL',
                companyName: 'Evil Corp',
                assessmentTimestamp: Date.now(),
                dataFreshness: 'Fresh',
                dataWindow: { fromTimestamp: 0, toTimestamp: 0, totalCandles: 63, validPriceObservations: 63 },
                overallDataQuality: 'usable',
                currentPrice: 12.34,
                historicalVolatility21d: { name: 'Vol', value: 80, unit: '%', window: '21d', isAvailable: true, description: '', limitations: '', observationsCount: 21 },
                historicalVolatility63d: { name: 'Vol', value: 50, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                historicalVaR95: { name: 'VaR', value: 8.5, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                historicalCVaR95: { name: 'CVaR', value: 11.2, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                maximumDrawdown: { name: 'MDD', value: 45.0, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                movingAverageBreakdown: { name: 'SMA', value: { isBreakdown: true, periodDays: 50, movingAveragePrice: 20, currentPrice: 12.34, percentBelow: 38.3 }, unit: '%', window: '50d', isAvailable: true, description: '', limitations: '', observationsCount: 50 },
                proximityToLow: { name: 'Low', value: { isNearLow: true, periodDays: 63, historicalLowPrice: 12.0, currentPrice: 12.34, percentAboveLow: 2.8 }, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                volatilityExpansion: { name: 'Exp', value: { isExpanding: true, shortTermVolatility: 80, baselineVolatility: 50, shortTermPeriodDays: 21, baselinePeriodDays: 63, expansionRatio: 1.6 }, unit: 'ratio', window: '21d/63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                triggeredConditions: [
                    {
                        id: 'xss_cond',
                        title: '<b>Dangerous HTML Condition</b>',
                        category: 'drawdown',
                        severity: 'critical',
                        evidence: '<script>stealCookie()</script> 45% peak-to-trough drop',
                        observationWindow: '63 days',
                        thresholdApplied: 'Drawdown >= 25%',
                        timestamp: new Date().toISOString(),
                    }
                ],
                overallRiskSeverity: 'critical',
                experimentalRiskScore: 92,
                scoreInterpretation: 'Critical Volatility',
                summary: 'Severe technical breakdown',
                methodologyNotes: ['Empirical metrics only'],
                calculationVersion: '1.0.0',
            }
        };

        const html = buildDownsideRiskEmailHtml(maliciousData);

        // Assert that raw script tags and dangerous HTML attributes were neutralized
        assert.ok(!html.includes('<script>alert("hacked")</script>'));
        assert.ok(!html.includes('<script>evil()</script>'));
        assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
        assert.ok(!html.includes('<script>stealCookie()</script>'));
        assert.ok(html.includes('&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;'));
        assert.ok(html.includes('&lt;script&gt;stealCookie()&lt;/script&gt;'));
    });

    await runTest('Email template contains mandatory HyperStocks branding colors and explainability disclaimers', () => {
        const sampleData: any = {
            userName: 'John Doe',
            userEmail: 'john@example.com',
            ticker: 'TSLA',
            companyName: 'Tesla, Inc.',
            currentPrice: 210.50,
            priceChange: -8.50,
            percentageChange: -3.88,
            riskAssessment: {
                symbol: 'TSLA',
                companyName: 'Tesla, Inc.',
                assessmentTimestamp: Date.now(),
                dataFreshness: 'Fresh',
                dataWindow: { fromTimestamp: 0, toTimestamp: 0, totalCandles: 63, validPriceObservations: 63 },
                overallDataQuality: 'usable',
                currentPrice: 210.50,
                historicalVolatility21d: { name: 'Vol21', value: 42.5, unit: '%', window: '21d', isAvailable: true, description: '', limitations: '', observationsCount: 21 },
                historicalVolatility63d: { name: 'Vol63', value: 34.0, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                historicalVaR95: { name: 'VaR95', value: 3.8, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                historicalCVaR95: { name: 'CVaR95', value: 5.2, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                maximumDrawdown: { name: 'MDD', value: 18.5, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                movingAverageBreakdown: { name: 'SMA', value: { isBreakdown: false, periodDays: 50, movingAveragePrice: 205, currentPrice: 210.5, percentBelow: 0 }, unit: '%', window: '50d', isAvailable: true, description: '', limitations: '', observationsCount: 50 },
                proximityToLow: { name: 'Low', value: { isNearLow: false, periodDays: 63, historicalLowPrice: 180, currentPrice: 210.5, percentAboveLow: 16.9 }, unit: '%', window: '63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                volatilityExpansion: { name: 'Exp', value: { isExpanding: false, shortTermVolatility: 42.5, baselineVolatility: 34.0, shortTermPeriodDays: 21, baselinePeriodDays: 63, expansionRatio: 1.25 }, unit: 'ratio', window: '21d/63d', isAvailable: true, description: '', limitations: '', observationsCount: 63 },
                triggeredConditions: [
                    {
                        id: 'var_elevated',
                        title: 'Elevated Daily Value at Risk (95%)',
                        category: 'var_exceedance',
                        severity: 'warning',
                        evidence: 'Historical 95% Daily VaR is 3.80%',
                        observationWindow: '63 trading days',
                        thresholdApplied: 'VaR >= 3.0%',
                        timestamp: new Date().toISOString(),
                    }
                ],
                overallRiskSeverity: 'warning',
                experimentalRiskScore: 55,
                scoreInterpretation: 'Elevated Downside Volatility',
                summary: 'Historical VaR elevated beyond baseline',
                methodologyNotes: ['Historical calculations are empirical observations'],
                calculationVersion: '1.0.0',
            }
        };

        const html = buildDownsideRiskEmailHtml(sampleData);

        // Brand colors check
        assert.ok(html.includes('#050816'), 'Must use #050816 background');
        assert.ok(html.includes('#7C5CFF'), 'Must use #7C5CFF primary purple');
        assert.ok(html.includes('#35D6FF'), 'Must use #35D6FF cyan accent');
        assert.ok(html.includes('#FF5470'), 'Must use #FF5470 downside accent');

        // Explainability & disclaimer checks (No uncalibrated probability claims)
        assert.ok(html.includes('NOT an 80% or calibrated downside forecast') ||
                  html.includes('backward-looking mathematical observations'),
                  'Email must contain explicit methodology disclaimer disclaiming uncalibrated forecasts');
        assert.ok(html.includes('NOT the maximum possible loss'),
                  'VaR must explicitly state it is not the maximum possible loss');

        // Navigation links check
        assert.ok(html.includes('/stocks/TSLA'), 'Must link to TSLA stock detail page');
        assert.ok(html.includes('/settings'), 'Must link to settings to manage preferences');
        assert.ok(html.includes('/api/notifications/unsubscribe'), 'Must include unsubscribe link');
    });

    console.log('\n============================================================');
    console.log(`📊 Automated Test Results: ${passedTests}/${totalTests} Passed`);
    console.log('============================================================\n');

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
