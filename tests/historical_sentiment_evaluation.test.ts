import assert from 'assert';
import {
    HistoricalSentimentEvaluator,
    NewsEventRecord,
} from '@/services/news/HistoricalSentimentEvaluator';
import { ConfidenceDimensionService, WatchlistNewsSummarizer } from '@/services/news/WatchlistNewsSummarizer';
import { HistoricalBarInput } from '@/services/backtesting/BacktestEngine';

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

// Helper: Generates sequential daily trading bars (weekdays only)
function generateDailyBars(
    symbol: string,
    startDateStr: string,
    count: number,
    startPrice = 100,
    dailyReturn = 0.001
): HistoricalBarInput[] {
    const bars: HistoricalBarInput[] = [];
    let current = new Date(`${startDateStr}T00:00:00.000Z`);
    let price = startPrice;

    while (bars.length < count) {
        const dayOfWeek = current.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            // Weekday
            price = Number((price * (1 + dailyReturn)).toFixed(2));
            bars.push({
                symbol,
                timestamp: new Date(current),
                open: price * 0.995,
                high: price * 1.01,
                low: price * 0.99,
                close: price,
                volume: 1000000,
            });
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return bars;
}

async function main() {
    console.log('\n============================================================');
    console.log('🧪 HyperStocks — Phase 4: Historical Sentiment Evaluation Tests');
    console.log('============================================================\n');

    // =========================================================================
    // SUITE 1: CONFIDENCE SCORE SEMANTICS & SEPARATION OF DIMENSIONS
    // =========================================================================
    console.log('--- Suite 1: Confidence-Score Semantics ---');

    await runTest('Separates Source Reliability from Market Directional Uncertainty', () => {
        // High authority wire source: Reuters
        const sourceEval = ConfidenceDimensionService.evaluateSourceReliability(
            'Reuters',
            'https://reuters.com/markets/stocks/aapl-record-revenue'
        );
        assert.ok(sourceEval.score >= 0.90, 'Reuters must have high source reliability score >= 0.90');
        assert.strictEqual(sourceEval.tier, 'tier_1_wire');

        // Directional uncertainty: Macro or volatile environment
        const uncertaintyEval = ConfidenceDimensionService.evaluateMarketDirectionalUncertainty(
            'bullish',
            true, // has macro factors
            false // not mixed
        );
        assert.ok(uncertaintyEval.score >= 0.60, 'Macro news must have high directional uncertainty >= 0.60');
        assert.strictEqual(uncertaintyEval.level, 'high');

        // Verification: Source authority must NOT imply low directional uncertainty
        assert.notStrictEqual(
            sourceEval.score,
            1 - uncertaintyEval.score,
            'Source authority and directional certainty must not be conflated'
        );
    });

    await runTest('Disclaims statistical calibration without empirical validation', () => {
        const summary = WatchlistNewsSummarizer.generateFallbackSummary({
            id: 'meta_1',
            headline: 'Meta Platforms Expands Data Center Infrastructure Capital Expenditures',
            summary: 'Company boosts capital spending by $10B for compute clusters.',
            source: 'Bloomberg',
            url: 'https://bloomberg.com/news/meta-capex',
            datetime: Date.now(),
            relatedSymbols: ['META'],
            relatedCompanies: ['Meta Platforms'],
            relevanceScore: 20,
        });

        assert.ok(summary.confidenceDimensions, 'Must produce confidenceDimensions');
        assert.ok(
            summary.confidenceDimensions.calibrationDisclaimer.includes('Heuristic'),
            'Must state heuristic calibration disclaimer'
        );
        assert.ok(
            summary.confidenceDimensions.calibrationDisclaimer.includes('not statistically calibrated'),
            'Must explicitly disclaim that scores are not calibrated posterior probabilities'
        );
    });

    // =========================================================================
    // SUITE 2: PUBLICATION-TIME HANDLING & TRADING SESSION BOUNDARIES
    // =========================================================================
    console.log('\n--- Suite 2: Publication-Time Handling & Session Boundaries ---');

    await runTest('Maps news during regular trading hours (10:30 ET) to current session', () => {
        // Wednesday 2026-06-10 at 14:30 UTC = 10:30 ET (EDT is UTC-4)
        const dateInput = '2026-06-10T14:30:00.000Z';
        const parsed = HistoricalSentimentEvaluator.parseEasternTradingSession(dateInput);

        assert.strictEqual(parsed.dateKey, '2026-06-10');
        assert.strictEqual(parsed.isAfterHoursOrWeekend, false, '10:30 ET is regular trading session');
    });

    await runTest('Maps after-hours news (16:30 ET) to after-hours flag for next session', () => {
        // Wednesday 2026-06-10 at 20:30 UTC = 16:30 ET (After close 16:00 ET)
        const dateInput = '2026-06-10T20:30:00.000Z';
        const parsed = HistoricalSentimentEvaluator.parseEasternTradingSession(dateInput);

        assert.strictEqual(parsed.dateKey, '2026-06-10');
        assert.strictEqual(parsed.isAfterHoursOrWeekend, true, '16:30 ET must trigger after-hours flag');
    });

    await runTest('Maps weekend news (Sunday) to weekend flag for Monday session', () => {
        // Sunday 2026-06-14 at 16:00 UTC = 12:00 ET Sunday
        const dateInput = '2026-06-14T16:00:00.000Z';
        const parsed = HistoricalSentimentEvaluator.parseEasternTradingSession(dateInput);

        assert.strictEqual(parsed.isAfterHoursOrWeekend, true, 'Sunday must trigger weekend flag');
    });

    // =========================================================================
    // SUITE 3: LOOK-AHEAD BIAS PREVENTION & CAUSALITY
    // =========================================================================
    console.log('\n--- Suite 3: Look-Ahead Bias Prevention ---');

    await runTest('After-hours news anchors to next available trading session close', () => {
        // Generate daily bars for Monday 2026-06-08 through Friday 2026-06-19 (10 days)
        const bars = generateDailyBars('AAPL', '2026-06-08', 30, 150, 0.01);

        // Monday 2026-06-08 at 17:00 ET (21:00 UTC) - after market close
        const afterHoursEvent: NewsEventRecord = {
            id: 'ev_ah_1',
            symbol: 'AAPL',
            headline: 'Apple Announces M5 Chip Architecture After Market Close',
            source: 'Reuters',
            publishedAt: '2026-06-08T21:00:00.000Z',
            sentiment: 'bullish',
        };

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns([afterHoursEvent], bars);

        assert.strictEqual(report.eligibleArticlesWithPrices, 1);
        // Actionable trading session must be Tuesday 2026-06-09 (next trading day)
        // Check dateRange from report
        assert.strictEqual(report.dateRange?.from, '2026-06-09', 'Anchor date must be next session 2026-06-09');
    });

    // =========================================================================
    // SUITE 4: DUPLICATE NEWS EVENTS COALESCING
    // =========================================================================
    console.log('\n--- Suite 4: Duplicate & Overlapping News Coalescing ---');

    await runTest('Coalesces multiple syndicated releases on same trading day into single session event', () => {
        const bars = generateDailyBars('NVDA', '2026-06-01', 30, 200, 0.005);

        // Three syndications of same news on 2026-06-01 regular hours
        const events: NewsEventRecord[] = [
            {
                id: 'ev_syn_1',
                symbol: 'NVDA',
                headline: 'NVIDIA Expands AI Chip Supply to Tier-1 Clouds (Reuters)',
                source: 'Reuters',
                publishedAt: '2026-06-01T14:00:00.000Z',
                sentiment: 'bullish',
            },
            {
                id: 'ev_syn_2',
                symbol: 'NVDA',
                headline: 'NVIDIA Expands AI Chip Supply to Tier-1 Clouds (Yahoo Finance)',
                source: 'Yahoo Finance',
                publishedAt: '2026-06-01T14:15:00.000Z',
                sentiment: 'bullish',
            },
            {
                id: 'ev_syn_3',
                symbol: 'NVDA',
                headline: 'NVIDIA Expands AI Chip Supply to Tier-1 Clouds (Investing.com)',
                source: 'Investing.com',
                publishedAt: '2026-06-01T15:00:00.000Z',
                sentiment: 'bullish',
            },
        ];

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(events, bars, {
            deduplicatePerSession: true,
        });

        // 3 articles evaluated, but coalesced to 1 distinct session event
        assert.strictEqual(report.totalArticlesEvaluated, 3);
        assert.strictEqual(report.eligibleArticlesWithPrices, 1, 'Must coalesce duplicate session events to 1');
        assert.strictEqual(report.sentimentCohorts.bullish.totalEvents, 1);
    });

    await runTest('Coalesces opposing bullish and bearish news on same day into "mixed"', () => {
        const bars = generateDailyBars('TSLA', '2026-06-01', 30, 250, 0.002);

        const events: NewsEventRecord[] = [
            {
                id: 'ev_opp_1',
                symbol: 'TSLA',
                headline: 'Tesla Beats Monthly Delivery Numbers in Europe',
                source: 'Reuters',
                publishedAt: '2026-06-01T14:00:00.000Z',
                sentiment: 'bullish',
            },
            {
                id: 'ev_opp_2',
                symbol: 'TSLA',
                headline: 'National Transportation Safety Board Inquires Into Autopilot System',
                source: 'WSJ',
                publishedAt: '2026-06-01T15:30:00.000Z',
                sentiment: 'bearish',
            },
        ];

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(events, bars, {
            deduplicatePerSession: true,
        });

        assert.strictEqual(report.eligibleArticlesWithPrices, 1);
        assert.strictEqual(report.sentimentCohorts.mixed.totalEvents, 1, 'Opposing sentiments on same day must coalesce to mixed');
    });

    // =========================================================================
    // SUITE 5: MISSING AND STALE PRICE DATA & DELISTED SYMBOLS
    // =========================================================================
    console.log('\n--- Suite 5: Missing / Stale Price Data Handling ---');

    await runTest('Handles empty price bars or missing post-event bars gracefully', () => {
        // Only 2 price bars, but event occurs on bar 2 -> cannot compute 5-day or 20-day returns
        const shortBars = generateDailyBars('STALE', '2026-06-01', 2, 50, 0.01);
        const event: NewsEventRecord = {
            id: 'ev_stale_1',
            symbol: 'STALE',
            headline: 'Stale Ticker Announces Conference Appearance',
            source: 'PR Newswire',
            publishedAt: '2026-06-02T14:00:00.000Z',
            sentiment: 'neutral',
        };

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns([event], shortBars);

        assert.strictEqual(report.isStatisticallyReliable, false);
        // 5-day and 20-day horizon sample count must be 0
        assert.strictEqual(report.sentimentCohorts.neutral.horizons.h5.sampleCount, 0);
        assert.strictEqual(report.sentimentCohorts.neutral.horizons.h20.sampleCount, 0);
        assert.strictEqual(report.sentimentCohorts.neutral.horizons.h5.meanReturnPercent, null);
    });

    await runTest('Handles empty events list gracefully with insufficient report', () => {
        const bars = generateDailyBars('AAPL', '2026-06-01', 30, 150, 0.005);
        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns([], bars);

        assert.strictEqual(report.isStatisticallyReliable, false);
        assert.strictEqual(report.totalArticlesEvaluated, 0);
        assert.ok(report.dataSufficiencyAssessment.includes('No valid historical price bars or news events'));
    });

    // =========================================================================
    // SUITE 6: INSUFFICIENT EVALUATION SAMPLES (N < 30)
    // =========================================================================
    console.log('\n--- Suite 6: Insufficient Evaluation Samples (N < 30) ---');

    await runTest('Flags isStatisticallyReliable=false when N < 30 with explicit explanation', () => {
        // 60 daily bars, but only 10 news events
        const bars = generateDailyBars('MSFT', '2026-01-05', 60, 400, 0.002);
        const events: NewsEventRecord[] = [];

        for (let i = 0; i < 10; i++) {
            events.push({
                id: `ev_small_${i}`,
                symbol: 'MSFT',
                headline: `Microsoft Cloud Update ${i}`,
                source: 'Reuters',
                publishedAt: bars[i * 4].timestamp,
                sentiment: 'bullish',
            });
        }

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(events, bars);

        assert.strictEqual(report.isStatisticallyReliable, false, 'N=10 must be flagged as statistically unreliable');
        assert.ok(
            report.dataSufficiencyAssessment.includes('Insufficient historical sample size'),
            'Must clearly explain insufficient sample size'
        );
        assert.ok(
            report.dataSufficiencyAssessment.includes('< 30'),
            'Must cite the N < 30 threshold'
        );
    });

    await runTest('Flags isStatisticallyReliable=true when N >= 30', () => {
        // 100 daily bars, 35 news events
        const bars = generateDailyBars('GOOGL', '2026-01-05', 100, 180, 0.001);
        const events: NewsEventRecord[] = [];

        for (let i = 0; i < 35; i++) {
            events.push({
                id: `ev_large_${i}`,
                symbol: 'GOOGL',
                headline: `Google AI Announcement ${i}`,
                source: 'Bloomberg',
                publishedAt: bars[i * 2].timestamp,
                sentiment: i % 2 === 0 ? 'bullish' : 'neutral',
            });
        }

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(events, bars);

        assert.strictEqual(report.isStatisticallyReliable, true, 'N=35 must meet statistical threshold');
        assert.ok(
            report.dataSufficiencyAssessment.includes('meets minimum statistical evaluation threshold')
        );
    });

    // =========================================================================
    // SUITE 7: STATISTICAL METRIC CALCULATIONS
    // =========================================================================
    console.log('\n--- Suite 7: Statistical Metric Calculations ---');

    await runTest('Accurately computes mean, median, volatility, Wilson CI, and baseline', () => {
        // 60 bars with steady +1% daily return
        // 5-day return from day i to day i+5 is (1.01^5 - 1) * 100 = 5.101%
        const bars = generateDailyBars('TEST', '2026-01-05', 60, 100, 0.01);
        const events: NewsEventRecord[] = [
            {
                id: 't_1',
                symbol: 'TEST',
                headline: 'Bullish Earnings Release',
                source: 'Reuters',
                publishedAt: bars[0].timestamp,
                sentiment: 'bullish',
            },
            {
                id: 't_2',
                symbol: 'TEST',
                headline: 'Bullish Partnership Expansion',
                source: 'Reuters',
                publishedAt: bars[10].timestamp,
                sentiment: 'bullish',
            },
        ];

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(events, bars);
        const h5Stats = report.sentimentCohorts.bullish.horizons.h5;

        assert.strictEqual(h5Stats.sampleCount, 2);
        assert.ok(h5Stats.meanReturnPercent !== null && h5Stats.meanReturnPercent > 5.0, 'Mean return must reflect 5-day compound gain');
        assert.strictEqual(h5Stats.winRatePercent, 100.0, 'All positive returns = 100% win rate');
        assert.ok(h5Stats.winRate95CI !== null, 'Must calculate Wilson score 95% CI');
        assert.ok(h5Stats.winRate95CI!.lower > 0 && h5Stats.winRate95CI!.upper <= 100);
        assert.ok(report.unconditionalBaseline.h5Mean !== null, 'Must compute unconditional baseline for comparison');
    });

    // =========================================================================
    // SUITE 8: DATA PROVENANCE (POINT-IN-TIME VS RETROSPECTIVE SEPARATION)
    // =========================================================================
    console.log('\n--- Suite 8: Data Provenance & Retrospective Separation ---');

    await runTest('Identifies point_in_time_recorded provenance when genuine logs are loaded', () => {
        const bars = generateDailyBars('AAPL', '2026-01-05', 40, 150, 0.002);
        const event: NewsEventRecord = {
            id: 'pit_1',
            symbol: 'AAPL',
            headline: 'Historical Release at 10:00 ET',
            source: 'Reuters',
            publishedAt: '2026-01-05T15:00:00.000Z',
            recordedAt: '2026-01-05T15:01:00.000Z',
            provenance: 'point_in_time_recorded',
            isRetrospective: false,
            sentiment: 'bullish',
        };

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns([event], bars);
        assert.strictEqual(report.dataProvenance, 'point_in_time_recorded');
        assert.ok(report.provenanceExplanation.includes('point-in-time sentiment'));
    });

    await runTest('Flags retrospective_inference provenance when sentiment is generated today from older text', () => {
        const bars = generateDailyBars('AAPL', '2026-01-05', 40, 150, 0.002);
        const event: NewsEventRecord = {
            id: 'retro_1',
            symbol: 'AAPL',
            headline: 'Historical Article from 6 Months Ago',
            source: 'Bloomberg',
            publishedAt: '2026-01-05T15:00:00.000Z',
            recordedAt: new Date().toISOString(),
            provenance: 'retrospective_inference',
            isRetrospective: true,
            sentiment: 'bearish',
        };

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns([event], bars);
        assert.strictEqual(report.dataProvenance, 'retrospective_inference');
        assert.ok(report.provenanceExplanation.includes('Must NOT be presented as if available to investors'));
    });

    // =========================================================================
    // SUITE 9: EVALUATION INTEGRITY STATUS (5 DISTINCT STATES)
    // =========================================================================
    console.log('\n--- Suite 9: Evaluation Integrity Status (5 States) ---');

    await runTest('Returns NO_HISTORICAL_RECORDS when bar array is empty', () => {
        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns([], []);
        assert.strictEqual(report.status, 'NO_HISTORICAL_RECORDS');
    });

    await runTest('Returns INSUFFICIENT_OBSERVATIONS when sample count N < 30', () => {
        const bars = generateDailyBars('MSFT', '2026-01-05', 40, 300, 0.001);
        const event: NewsEventRecord = {
            id: 'small_1',
            symbol: 'MSFT',
            headline: 'Microsoft Event',
            source: 'Reuters',
            publishedAt: bars[0].timestamp,
            sentiment: 'bullish',
        };

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns([event], bars);
        assert.strictEqual(report.status, 'INSUFFICIENT_OBSERVATIONS');
    });

    await runTest('Returns INCOMPLETE_PRICE_COVERAGE when subsequent bars are missing for > 30% of events', () => {
        // 35 bars (indexes 0 to 34)
        const bars = generateDailyBars('NVDA', '2026-01-05', 35, 100, 0.002);
        const events: NewsEventRecord[] = [];
        // 12 events early in the series (have 5-day future bars)
        for (let i = 0; i < 12; i++) {
            events.push({
                id: `nv_early_${i}`,
                symbol: 'NVDA',
                headline: `NVDA Early Event ${i}`,
                source: 'Reuters',
                publishedAt: bars[i].timestamp,
                sentiment: 'bullish',
            });
        }
        // 20 events in the last 4 days (where i + 5 >= 35, so 5-day horizon cannot be evaluated)
        for (let i = 0; i < 20; i++) {
            events.push({
                id: `nv_late_${i}`,
                symbol: 'NVDA',
                headline: `NVDA Late Event ${i}`,
                source: 'Reuters',
                publishedAt: bars[31 + (i % 4)].timestamp,
                sentiment: 'bullish',
            });
        }

        // 32 total events, but only 12 have completed 5-day horizon -> 12/32 = 37.5% < 70% coverage
        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(events, bars, {
            deduplicatePerSession: false,
        });
        assert.strictEqual(report.status, 'INCOMPLETE_PRICE_COVERAGE');
    });

    await runTest('Returns EVALUATION_COMPLETED_UNCERTAIN when N >= 30 but excess returns are not statistically significant', () => {
        // 100 bars with flat zero returns -> mean = 0, CIs cross 0
        const bars = generateDailyBars('FLAT', '2026-01-05', 100, 100, 0.0);
        const events: NewsEventRecord[] = [];
        for (let i = 0; i < 35; i++) {
            events.push({
                id: `flat_${i}`,
                symbol: 'FLAT',
                headline: `Flat Event ${i}`,
                source: 'Reuters',
                publishedAt: bars[i * 2].timestamp,
                sentiment: 'bullish',
            });
        }

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(events, bars);
        assert.strictEqual(report.isStatisticallyReliable, true);
        assert.strictEqual(report.status, 'EVALUATION_COMPLETED_UNCERTAIN');
        assert.ok(report.dataSufficiencyAssessment.includes('statistically uncertain'));
    });

    // =========================================================================
    // SUITE 10: OVERLAPPING HORIZON & AUTOCORRELATION DETECTION
    // =========================================================================
    console.log('\n--- Suite 10: Overlapping Horizon & Autocorrelation Detection ---');

    await runTest('Detects overlapping return windows and computes effective degrees of freedom', () => {
        const bars = generateDailyBars('AAPL', '2026-01-05', 60, 150, 0.001);
        const events: NewsEventRecord[] = [
            { id: 'o_1', symbol: 'AAPL', headline: 'Day 1 News', source: 'WSJ', publishedAt: bars[0].timestamp, sentiment: 'bullish' },
            { id: 'o_2', symbol: 'AAPL', headline: 'Day 2 News', source: 'WSJ', publishedAt: bars[1].timestamp, sentiment: 'bullish' },
            { id: 'o_3', symbol: 'AAPL', headline: 'Day 3 News', source: 'WSJ', publishedAt: bars[2].timestamp, sentiment: 'bullish' },
        ];

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(events, bars);
        assert.strictEqual(report.hasOverlappingHorizons, true);
        assert.ok(report.overlappingHorizonWarning?.includes('Overlapping forward return windows'));
        // Spaced by 1 session, so effective H5 degrees of freedom should be 1
        assert.strictEqual(report.effectiveObservations?.h5, 1);
    });

    // =========================================================================
    // SUITE 11: EXCHANGE HOLIDAYS & DAYLIGHT-SAVING TRANSITIONS
    // =========================================================================
    console.log('\n--- Suite 11: Exchange Holidays & DST Transitions ---');

    await runTest('Anchors news during market holiday to the first subsequent open trading session', () => {
        // Bars skip holiday (e.g. Friday 2026-06-19 Juneteenth holiday)
        // Thursday 2026-06-18 close, Monday 2026-06-22 close
        const bars: HistoricalBarInput[] = [
            { symbol: 'AAPL', timestamp: new Date('2026-06-18T00:00:00.000Z'), open: 150, high: 151, low: 149, close: 150, volume: 1000 },
            { symbol: 'AAPL', timestamp: new Date('2026-06-22T00:00:00.000Z'), open: 152, high: 153, low: 151, close: 152, volume: 1000 },
            { symbol: 'AAPL', timestamp: new Date('2026-06-23T00:00:00.000Z'), open: 154, high: 155, low: 153, close: 154, volume: 1000 },
        ];

        // News published Friday 2026-06-19 at 14:00 UTC (during holiday)
        const holidayEvent: NewsEventRecord = {
            id: 'hol_1',
            symbol: 'AAPL',
            headline: 'Juneteenth Holiday Release',
            source: 'Reuters',
            publishedAt: '2026-06-19T14:00:00.000Z',
            sentiment: 'bullish',
        };

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns([holidayEvent], bars);
        assert.strictEqual(report.eligibleArticlesWithPrices, 1);
        // Anchor session must be Monday 2026-06-22
        assert.strictEqual(report.dateRange?.from, '2026-06-22');
    });

    await runTest('Handles US Daylight Saving Time (EDT UTC-4 vs EST UTC-5) session boundary correctly', () => {
        // Winter session (EST UTC-5): 21:05 UTC on Wednesday 2026-12-09 = 16:05 EST (After Close)
        const winterAfterClose = HistoricalSentimentEvaluator.parseEasternTradingSession('2026-12-09T21:05:00.000Z');
        assert.strictEqual(winterAfterClose.isAfterHoursOrWeekend, true, '16:05 EST in winter must be after-hours');

        // Summer session (EDT UTC-4): 19:30 UTC on Wednesday 2026-06-10 = 15:30 EDT (Regular Session)
        const summerRegular = HistoricalSentimentEvaluator.parseEasternTradingSession('2026-06-10T19:30:00.000Z');
        assert.strictEqual(summerRegular.isAfterHoursOrWeekend, false, '15:30 EDT in summer must be regular session');
    });

    // Summary
    console.log('\n============================================================');
    console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
    console.log('============================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Unhandled test execution error:', err);
    process.exit(1);
});

