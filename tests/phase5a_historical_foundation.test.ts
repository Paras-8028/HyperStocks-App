import assert from 'assert';
import { DownsideRiskEngine } from '../services/risk/DownsideRiskEngine';
import { HistoricalDataIngestService } from '../services/market/HistoricalDataIngestService';
import { HistoricalBarModel, IHistoricalBarDocument } from '../database/models/historical_bar.model';
import { RiskSignalLogModel } from '../database/models/risk_signal_log.model';
import { StockCandlesResult, StockQuote } from '../types/market';
import { IMarketDataProvider } from '../services/market/IMarketDataProvider';

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

function generateDailyCandles(count: number, basePrice: number, dailyTrend: number = 0): StockCandlesResult {
    const closes: number[] = [];
    const opens: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const timestamps: number[] = [];
    const volumes: number[] = [];

    let currentPrice = basePrice;
    const baseTimestamp = 1700000000;

    for (let i = 0; i < count; i++) {
        const open = currentPrice;
        currentPrice = Math.max(1.0, currentPrice * (1 + dailyTrend + (i % 2 === 0 ? 0.01 : -0.01)));
        const close = currentPrice;
        const high = Math.max(open, close) * 1.015;
        const low = Math.min(open, close) * 0.985;
        const volume = 1500000;

        opens.push(open);
        closes.push(close);
        highs.push(high);
        lows.push(low);
        timestamps.push(baseTimestamp + i * 86400);
        volumes.push(volume);
    }

    return {
        symbol: 'TEST',
        open: opens,
        close: closes,
        high: highs,
        low: lows,
        timestamps,
        volume: volumes,
        status: 'ok',
    };
}

// Mock Market Provider for unit testing ingestion without external API calls
class MockMarketDataProvider implements IMarketDataProvider {
    public callCount = 0;
    public requestedSymbols: string[] = [];
    public mockResponses: Map<string, { success: boolean; data?: any; error?: string; code?: number }> = new Map();

    async getQuote(symbol: string): Promise<any> {
        return { success: true, data: { symbol, currentPrice: 150.0, change: 1.0, percentChange: 0.67 } };
    }
    async getCandles(symbol: string, resolution: any, from: number, to: number): Promise<any> {
        this.callCount++;
        this.requestedSymbols.push(symbol);
        if (this.mockResponses.has(symbol)) {
            return this.mockResponses.get(symbol);
        }
        return {
            success: true,
            data: generateDailyCandles(30, 100),
        };
    }
    async getCompanyProfile(symbol: string): Promise<any> {
        return { success: true, data: { name: symbol } };
    }
    async getFinancialMetrics(symbol: string): Promise<any> {
        return { success: true, data: {} };
    }
    async searchStocks(query?: string): Promise<any> {
        return { success: true, data: [] };
    }
    async getMarketPeers(symbol: string): Promise<any> {
        return { success: true, data: [] };
    }
}

async function main() {
    console.log('\n============================================================');
    console.log('🧪 HyperStocks — Phase 5A Historical Foundation Test Suite');
    console.log('============================================================\n');

    // =========================================================================
    // SUITE 1: RISK ENGINE DAILY-CANDLE INTEGRITY (REGRESSION VERIFICATION)
    // =========================================================================
    console.log('--- Suite 1: Daily-Candle Integrity & Intraday Quote Decoupling ---');

    await runTest('Historical daily closing prices are NEVER overwritten when a live quote is supplied', () => {
        const count = 30;
        const candles = generateDailyCandles(count, 100);
        const originalLastClose = candles.close[count - 1];

        // Provide a disparate live intraday quote
        const liveQuote: StockQuote = {
            symbol: 'TEST',
            currentPrice: 999.99, // Extreme intraday price spike
            change: 899.99,
            percentChange: 900.0,
            highPrice: 1000.0,
            lowPrice: 99.0,
            openPrice: 100.0,
            previousClose: originalLastClose,
            timestamp: Math.floor(Date.now() / 1000),
        };

        const assessment = DownsideRiskEngine.assessDownsideRisk('TEST', 'Test Corp', candles, liveQuote);

        // 1. Current reference price reflects live quote for real-time monitoring
        assert.strictEqual(assessment.currentPrice, 999.99);
        assert.strictEqual(assessment.referencePriceType, 'live_intraday_quote');

        // 2. Returns must NOT be computed using the live quote in place of the last historical close
        // If it was overwritten, the 21d volatility would explode to hundreds of percent
        const returns = DownsideRiskEngine.calculateDailyReturns(candles.close);
        const expectedVol = DownsideRiskEngine.calculateAnnualizedVolatility(returns.slice(returns.length - 21));
        assert.strictEqual(assessment.historicalVolatility21d.value, expectedVol);
        assert.ok(assessment.historicalVolatility21d.value! < 50.0, 'Historical volatility must remain untainted by live quote');
    });

    await runTest('Assessment without live quote marks referencePriceType as completed_daily_close', () => {
        const candles = generateDailyCandles(30, 100);
        const lastClose = candles.close[candles.close.length - 1];

        const assessment = DownsideRiskEngine.assessDownsideRisk('TEST', 'Test Corp', candles, null);

        assert.strictEqual(assessment.currentPrice, Number(lastClose.toFixed(2)));
        assert.strictEqual(assessment.referencePriceType, 'completed_daily_close');
    });

    await runTest('Drawdown calculation tests live quote against historical peak without corrupting past series', () => {
        // Construct 20 rising candles to peak of $100
        const candles = generateDailyCandles(20, 100, 0); // Flat at 100
        const historicalMDD = DownsideRiskEngine.calculateMaximumDrawdown(candles.close);
        assert.ok(historicalMDD! < 2.0);

        // Intraday crash to $60 (a 40% intraday drop from peak of $100)
        const liveCrashingQuote: StockQuote = {
            symbol: 'TEST',
            currentPrice: 60.0,
            change: -40.0,
            percentChange: -40.0,
            highPrice: 100.0,
            lowPrice: 59.0,
            openPrice: 100.0,
            previousClose: 100.0,
            timestamp: Math.floor(Date.now() / 1000),
        };

        const assessment = DownsideRiskEngine.assessDownsideRisk('TEST', 'Test Corp', candles, liveCrashingQuote);

        // Historical close series had ~0% drawdown, but live quote registers the 40% intraday drawdown
        assert.ok(assessment.maximumDrawdown.value! >= 39.0, `Expected ~40% drawdown with live quote, got: ${assessment.maximumDrawdown.value}%`);
        assert.strictEqual(assessment.maximumDrawdown.severity, 'critical');
    });

    await runTest('Moving Average Breakdown evaluates live price against completed SMA without modifying SMA', () => {
        // 55 candles at steady $100
        const candles = generateDailyCandles(55, 100, 0);

        // Live quote plunged to $80 (20% below 50-day SMA of $100)
        const liveBreakdownQuote: StockQuote = {
            symbol: 'TEST',
            currentPrice: 80.0,
            change: -20.0,
            percentChange: -20.0,
            highPrice: 100.0,
            lowPrice: 79.0,
            openPrice: 100.0,
            previousClose: 100.0,
            timestamp: Math.floor(Date.now() / 1000),
        };

        const assessment = DownsideRiskEngine.assessDownsideRisk('TEST', 'Test Corp', candles, liveBreakdownQuote);
        const ma = assessment.movingAverageBreakdown.value!;

        assert.strictEqual(ma.isBreakdown, true);
        assert.strictEqual(ma.currentPrice, 80.0);
        assert.ok(Math.abs(ma.movingAveragePrice - 100.0) < 2.0);
        assert.ok(ma.percentBelow >= 18.0);
    });

    // =========================================================================
    // SUITE 2: HISTORICAL BAR MODEL & POINT-IN-TIME LOG VALIDATION
    // =========================================================================
    console.log('\n--- Suite 2: Historical Bar & Point-In-Time Risk Schemas ---');

    await runTest('HistoricalBarModel validates OHLC price consistency', async () => {
        // 1. Invalid: High < Low
        const invalidHighLow = new HistoricalBarModel({
            symbol: 'AAPL',
            timestamp: new Date('2026-01-02T00:00:00Z'),
            open: 150,
            high: 140, // High < Low!
            low: 145,
            close: 148,
            volume: 1000000,
            resolution: 'D',
            source: 'finnhub',
        });
        let err1: any;
        try {
            await invalidHighLow.validate();
        } catch (e) {
            err1 = e;
        }
        assert.ok(err1, 'Must reject bar where High < Low');

        // 2. Invalid: Open > High
        const invalidOpen = new HistoricalBarModel({
            symbol: 'AAPL',
            timestamp: new Date('2026-01-02T00:00:00Z'),
            open: 160, // Open > High!
            high: 155,
            low: 145,
            close: 150,
            volume: 1000000,
            resolution: 'D',
            source: 'finnhub',
        });
        let err2: any;
        try {
            await invalidOpen.validate();
        } catch (e) {
            err2 = e;
        }
        assert.ok(err2, 'Must reject bar where Open > High');

        // 3. Invalid: Negative Volume
        const invalidVolume = new HistoricalBarModel({
            symbol: 'AAPL',
            timestamp: new Date('2026-01-02T00:00:00Z'),
            open: 150,
            high: 155,
            low: 145,
            close: 150,
            volume: -500, // Negative!
            resolution: 'D',
            source: 'finnhub',
        });
        let err3: any;
        try {
            await invalidVolume.validate();
        } catch (e) {
            err3 = e;
        }
        assert.ok(err3, 'Must reject bar with negative volume');

        // 4. Valid Bar passes cleanly with null adjustedClose
        const validBar = new HistoricalBarModel({
            symbol: 'aapl ', // Should normalize to AAPL
            timestamp: new Date('2026-01-02T00:00:00Z'),
            open: 150.25,
            high: 155.5,
            low: 149.0,
            close: 153.75,
            adjustedClose: null,
            volume: 2500000,
            resolution: 'D',
            source: 'finnhub',
        });
        const err4 = await validBar.validate();
        assert.strictEqual(err4, undefined);
        assert.strictEqual(validBar.symbol, 'AAPL');
        assert.strictEqual(validBar.adjustedClose, null);
    });

    await runTest('RiskSignalLogModel validates point-in-time schema structure and nullability', async () => {
        const log = new RiskSignalLogModel({
            symbol: 'msft ',
            assessmentTimestamp: new Date('2026-01-05T16:00:00Z'),
            referencePrice: 420.5,
            priceType: 'completed_daily_close',
            dataAsOfTimestamp: new Date('2026-01-05T16:00:00Z'),
            engineVersion: '1.0.0-phase3',
            dataSource: 'finnhub',
            dataQuality: 'sufficient',
            historicalVolatility21d: 22.5,
            historicalVolatility63d: 19.8,
            historicalVaR95: 2.85,
            historicalCVaR95: 3.9,
            maximumDrawdown: 12.4,
            smaDistancePercent: -2.3,
            lowProximityPercent: 14.5,
            volatilityExpansionRatio: 1.14,
            experimentalRiskScore: 35,
            severity: 'low',
            triggeredConditions: [],
            thresholdsApplied: ['VaR >= 3.5%', 'MDD >= 20.0%'],
            assessmentStatus: 'completed',
            summary: 'MSFT operating within normal risk limits.',
        });

        const err = await log.validate();
        assert.strictEqual(err, undefined);
        assert.strictEqual(log.symbol, 'MSFT');
        assert.strictEqual(log.severity, 'low');
        assert.strictEqual(log.priceType, 'completed_daily_close');
    });

    // =========================================================================
    // SUITE 3: HISTORICAL DATA INGESTION SERVICE
    // =========================================================================
    console.log('\n--- Suite 3: Historical Ingestion Service & Rate Limiting ---');

    await runTest('HistoricalDataIngestService dry-run mode validates bars without database writes', async () => {
        const mockProvider = new MockMarketDataProvider();
        const ingestService = new HistoricalDataIngestService(mockProvider);

        const result = await ingestService.ingestSymbols(['AAPL', 'NVDA'], {
            from: 1700000000,
            to: 1700086400 * 30,
            resolution: 'D',
            dryRun: true, // Dry run
        });

        assert.strictEqual(result.dryRun, true);
        assert.strictEqual(result.totalSymbols, 2);
        assert.strictEqual(result.successfulSymbols, 2);
        assert.strictEqual(result.totalBarsSaved, 60); // 30 per symbol validated
        assert.strictEqual(mockProvider.callCount, 2);
    });

    await runTest('HistoricalDataIngestService deduplicates and normalizes input symbols', async () => {
        const mockProvider = new MockMarketDataProvider();
        const ingestService = new HistoricalDataIngestService(mockProvider);

        // Duplicate and mixed-case symbols
        await ingestService.ingestSymbols(['aapl', 'AAPL ', 'Aapl', 'TSLA', 'tsla'], {
            from: 1700000000,
            to: 1702000000,
            dryRun: true,
        });

        // Must reduce to exactly 2 unique symbols ['AAPL', 'TSLA']
        assert.strictEqual(mockProvider.requestedSymbols.length, 2);
        assert.deepStrictEqual(mockProvider.requestedSymbols.sort(), ['AAPL', 'TSLA']);
    });

    await runTest('HistoricalDataIngestService handles HTTP 429 rate limit with exponential backoff retry', async () => {
        const mockProvider = new MockMarketDataProvider();
        let attempts = 0;

        // Custom candle handler that fails with 429 on first 2 attempts, then succeeds
        mockProvider.getCandles = async (sym: string) => {
            attempts++;
            if (attempts < 3) {
                return {
                    success: false,
                    error: 'API error 429: Too Many Requests',
                    code: 429,
                };
            }
            return {
                success: true,
                data: generateDailyCandles(15, 100),
            };
        };

        const ingestService = new HistoricalDataIngestService(mockProvider);
        const summary = await ingestService.ingestSingleSymbol('RATE_LIMITED', {
            from: 1700000000,
            to: 1702000000,
            resolution: 'D',
            maxRetries: 3,
            dryRun: true,
            skipExisting: false,
        });

        assert.strictEqual(summary.status, 'success');
        assert.strictEqual(summary.retryCount, 2);
        assert.strictEqual(attempts, 3);
    });

    await runTest('HistoricalDataIngestService filters corrupted candles from raw provider response', async () => {
        const mockProvider = new MockMarketDataProvider();
        mockProvider.mockResponses.set('CORRUPT_STOCK', {
            success: true,
            data: {
                symbol: 'CORRUPT_STOCK',
                s: 'ok',
                open: [100, 102, 0, 105],      // 3rd bar is invalid (0 price)
                high: [105, 106, 0, 110],
                low: [98, 100, 0, 103],
                close: [102, 104, 0, 108],
                timestamps: [1700000000, 1700086400, 1700172800, 1700259200],
                volume: [1000, 2000, 0, 1500],
            },
        });

        const ingestService = new HistoricalDataIngestService(mockProvider);
        const summary = await ingestService.ingestSingleSymbol('CORRUPT_STOCK', {
            from: 1700000000,
            to: 1700300000,
            resolution: 'D',
            maxRetries: 1,
            dryRun: true,
            skipExisting: false,
        });

        assert.strictEqual(summary.status, 'success');
        assert.strictEqual(summary.barsFetched, 4);
        assert.strictEqual(summary.barsSaved, 3); // The corrupted 3rd bar was excluded
    });

    await runTest('HistoricalDataIngestService continues processing remaining symbols when one fails', async () => {
        const mockProvider = new MockMarketDataProvider();
        mockProvider.mockResponses.set('FAIL_SYM', {
            success: false,
            error: 'Provider HTTP 500 Internal Server Error',
            code: 500,
        });

        const ingestService = new HistoricalDataIngestService(mockProvider);
        const result = await ingestService.ingestSymbols(['FAIL_SYM', 'GOOD_SYM'], {
            from: 1700000000,
            to: 1702000000,
            dryRun: true,
        });

        assert.strictEqual(result.totalSymbols, 2);
        assert.strictEqual(result.failedSymbols, 1);
        assert.strictEqual(result.successfulSymbols, 1);
        assert.strictEqual(result.summaries.find(s => s.symbol === 'FAIL_SYM')?.status, 'error');
        assert.strictEqual(result.summaries.find(s => s.symbol === 'GOOD_SYM')?.status, 'success');
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
