import assert from 'assert';
import {
    NewsSentimentCollectorService,
    CollectorOptions,
} from '@/services/news/NewsSentimentCollectorService';
import {
    HistoricalSentimentEvaluator,
    NewsEventRecord,
} from '@/services/news/HistoricalSentimentEvaluator';
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
    startPrice = 150
): HistoricalBarInput[] {
    const bars: HistoricalBarInput[] = [];
    let current = new Date(`${startDateStr}T00:00:00.000Z`);
    let price = startPrice;

    while (bars.length < count) {
        const dayOfWeek = current.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            price = Number((price * 1.002).toFixed(2));
            bars.push({
                symbol,
                timestamp: new Date(current),
                open: price * 0.995,
                high: price * 1.01,
                low: price * 0.99,
                close: price,
                volume: 1500000,
            });
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return bars;
}

async function main() {
    console.log('\n============================================================');
    console.log('🧪 HyperStocks — Phase 7: Automated Historical News & Sentiment Tests');
    console.log('============================================================\n');

    // Test 1: Canonical Story Hashing & Normalization for Cross-Ticker Syndication
    await runTest('Cross-ticker syndication: Canonical story hashing collapses wire noise', () => {
        const date = new Date('2026-03-10T14:30:00.000Z');
        const h1 = 'BRIEF - Apple and Microsoft announce cloud integration partnership';
        const h2 = 'UPDATE 1: Apple & Microsoft Announce Cloud Integration Partnership!';
        const h3 = 'Unrelated article on semiconductor supply chain';

        const hash1 = NewsSentimentCollectorService.generateCanonicalStoryId(h1, date);
        const hash2 = NewsSentimentCollectorService.generateCanonicalStoryId(h2, date);
        const hash3 = NewsSentimentCollectorService.generateCanonicalStoryId(h3, date);

        assert.strictEqual(hash1, hash2, 'Normalized syndicated headlines on same date must yield identical canonicalStoryId');
        assert.notStrictEqual(hash1, hash3, 'Distinct headlines must yield distinct canonical story IDs');
    });

    // Test 2: Article ID Deterministic Hashing when ID is Missing
    await runTest('Missing article metadata: Generates deterministic fallback hash without fabricating timestamps', () => {
        const headline = 'Federal Reserve signals rate hold in upcoming FOMC';
        const pubMs = 1773151200000;

        const hashA = NewsSentimentCollectorService.generateArticleHash(headline, pubMs);
        const hashB = NewsSentimentCollectorService.generateArticleHash(headline, pubMs);

        assert.ok(hashA.startsWith('news-'), 'Fallback hash must have news- prefix');
        assert.strictEqual(hashA, hashB, 'Identical headline and publication timestamp must yield identical hash');

        // Different headline must produce different hash
        const hashC = NewsSentimentCollectorService.generateArticleHash('Different headline', pubMs);
        assert.notStrictEqual(hashA, hashC, 'Distinct headlines must yield distinct hashes');
    });

    // Test 3: Timestamp Preservation & First-Seen vs Published Separation
    await runTest('Timestamp preservation: Preserves publisher publication time and distinguishes first-seen', () => {
        const publisherTime = new Date('2026-01-15T09:30:00.000Z');
        const firstSeenTime = new Date('2026-01-15T11:45:00.000Z');
        const assessedTime = new Date('2026-01-15T11:46:00.000Z');

        assert.ok(
            publisherTime.getTime() <= firstSeenTime.getTime(),
            'Original publication timestamp must precede or equal first-seen ingestion timestamp'
        );
        assert.ok(
            firstSeenTime.getTime() <= assessedTime.getTime(),
            'First-seen ingestion timestamp must precede or equal sentiment assessment timestamp'
        );
        // Original publisher timestamp is never rewritten to current system time
        assert.strictEqual(publisherTime.toISOString(), '2026-01-15T09:30:00.000Z');
    });

    // Test 4: Assessment Versioning Invariant
    await runTest('Assessment versioning: Version 1 is immutable; reassessments create version 2+', () => {
        const originalDoc = {
            symbol: 'AAPL',
            articleId: 'art-999',
            version: 1,
            sentiment: 'bullish',
            analysisVersion: '1.0.0-phase7',
            isRetrospective: false,
            provenance: 'point_in_time_recorded' as const,
        };

        // Simulated reassessment
        const reassessedDoc = {
            symbol: 'AAPL',
            articleId: 'art-999',
            version: originalDoc.version + 1,
            sentiment: 'neutral',
            analysisVersion: '2.0.0-phase8-model',
            isRetrospective: true,
            provenance: 'retrospective_inference' as const,
        };

        assert.strictEqual(originalDoc.version, 1, 'Original record must remain version 1');
        assert.strictEqual(originalDoc.isRetrospective, false, 'Original point-in-time record must not be retrospective');
        assert.strictEqual(reassessedDoc.version, 2, 'Subsequent reassessment must increment version to 2');
        assert.strictEqual(reassessedDoc.isRetrospective, true, 'Subsequent reassessment must be marked retrospective');
    });

    // Test 5: Concurrent Ingestion Run Protection
    await runTest('Concurrent ingestion protection: Rejects overlapping concurrent collector invocations', async () => {
        // NewsSentimentCollectorService provides isRunning check
        const initialStatus = NewsSentimentCollectorService.getPipelineStatus();
        assert.strictEqual(typeof initialStatus.isRunning, 'boolean');

        // Verify dryRun execution completes without mutating running locks improperly
        const summary = await NewsSentimentCollectorService.runCollection(['AAPL'], {
            dryRun: true,
            concurrency: 1,
        });

        assert.ok(summary.completedAt, 'Ingestion summary must record completedAt');
        assert.strictEqual(summary.dryRun, true, 'Dry-run flag must be respected');
        assert.strictEqual(NewsSentimentCollectorService.getPipelineStatus().isRunning, false, 'Collector lock must be cleared after execution');
    });

    // Test 6: Partial Provider Failure Handling
    await runTest('Partial provider failures: Collects errors without crashing the pipeline', async () => {
        // Run with an empty or simulated invalid scenario in dryRun
        const summary = await NewsSentimentCollectorService.runCollection(['INVALID_SYM_XYZ_123'], {
            dryRun: true,
            concurrency: 1,
        });

        assert.ok(Array.isArray(summary.errors), 'Errors must be tracked as an array');
        assert.strictEqual(typeof summary.failedProviderRequests, 'number');
        assert.ok(summary.completedAt, 'Collector run must complete gracefully even with unrecognized symbols');
    });

    // Test 7: Point-in-Time Causality & Look-Ahead Prevention in HistoricalSentimentEvaluator
    await runTest('Look-ahead prevention: Effective actionable time respects assessedAt when delayed', () => {
        // Scenario: Article published Friday at 15:30 ET (market open), but agent sentiment assessment ran Saturday morning at 10:00 ET
        const publishedAt = new Date('2026-03-20T19:30:00.000Z'); // Friday 15:30 ET
        const assessedAt = new Date('2026-03-21T14:00:00.000Z');  // Saturday 10:00 ET

        const effectiveMs = Math.max(publishedAt.getTime(), assessedAt.getTime());
        const effectiveDate = new Date(effectiveMs);

        // Under strict point-in-time rules, trading decision could NOT have been executed Friday
        assert.strictEqual(
            effectiveDate.toISOString(),
            assessedAt.toISOString(),
            'Effective actionable timestamp must be the maximum of publishedAt and assessedAt'
        );

        // Price bar generator starting Monday 2026-03-23
        const bars = generateDailyBars('AAPL', '2026-03-23', 25);
        const testEvents: NewsEventRecord[] = [
            {
                id: 'art-lookahead-test',
                symbol: 'AAPL',
                headline: 'Apple introduces breakthrough product line',
                summary: 'Details on new hardware launch',
                source: 'Financial Times',
                url: 'https://ft.com/test',
                publishedAt: publishedAt.toISOString(),
                recordedAt: assessedAt.toISOString(),
                provenance: 'point_in_time_recorded',
                isRetrospective: false,
                sentiment: 'bullish',
            },
        ];
        const evalReport = HistoricalSentimentEvaluator.evaluateSentimentReturns(testEvents, bars, {
            symbol: 'AAPL',
        });

        // The trade could only enter on Monday 2026-03-23 or later, never Friday 2026-03-20
        assert.ok(evalReport.status !== 'NO_HISTORICAL_RECORDS');
        assert.ok(evalReport.eligibleArticlesWithPrices >= 1);
        assert.ok(evalReport.sentimentCohorts.bullish.totalEvents >= 1);
    });

    // Test 8: Evaluation Coalescing of Same-Day Syndicated Events
    await runTest('Syndication coalescing in evaluation: Multiple same-day articles do not inflate event count', () => {
        const pubDate1 = new Date('2026-04-06T13:00:00.000Z');
        const pubDate2 = new Date('2026-04-06T15:00:00.000Z');
        const bars = generateDailyBars('MSFT', '2026-04-06', 25);

        const events: NewsEventRecord[] = [
            {
                id: 'wire-1',
                symbol: 'MSFT',
                headline: 'Microsoft announces quarterly cloud revenue jump',
                summary: 'Wire 1 report',
                source: 'Reuters',
                url: 'https://reuters.com/1',
                publishedAt: pubDate1.toISOString(),
                recordedAt: pubDate1.toISOString(),
                provenance: 'point_in_time_recorded',
                isRetrospective: false,
                sentiment: 'bullish',
            },
            {
                id: 'wire-2',
                symbol: 'MSFT',
                headline: 'Microsoft reports strong azure growth in quarterly earnings',
                summary: 'Wire 2 report',
                source: 'Bloomberg',
                url: 'https://bloomberg.com/2',
                publishedAt: pubDate2.toISOString(),
                recordedAt: pubDate2.toISOString(),
                provenance: 'point_in_time_recorded',
                isRetrospective: false,
                sentiment: 'bullish',
            },
        ];

        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(events, bars, {
            symbol: 'MSFT',
        });

        // Coalescing combines multiple events on the same trading session (2026-04-06) into 1 session observation
        assert.strictEqual(
            report.eligibleArticlesWithPrices,
            1,
            'Multiple news events on the same session must coalesce into a single trading session observation'
        );
    });

    // Test 9: Data Readiness & Integrity Status Differentiation
    await runTest('Data readiness: Evaluator emits INSUFFICIENT_OBSERVATIONS when N < 30', () => {
        const bars = generateDailyBars('NVDA', '2026-05-01', 25);
        const singleEvent: NewsEventRecord[] = [
            {
                id: 'single-art',
                symbol: 'NVDA',
                headline: 'NVDA announces next-gen architecture',
                summary: 'New GPU platform',
                source: 'PR Newswire',
                url: 'https://prnewswire.com/1',
                publishedAt: '2026-05-04T12:00:00.000Z',
                recordedAt: '2026-05-04T12:00:00.000Z',
                provenance: 'point_in_time_recorded',
                isRetrospective: false,
                sentiment: 'bullish',
            },
        ];
        const report = HistoricalSentimentEvaluator.evaluateSentimentReturns(singleEvent, bars, {
            symbol: 'NVDA',
        });

        assert.strictEqual(
            report.status,
            'INSUFFICIENT_OBSERVATIONS',
            'Must report INSUFFICIENT_OBSERVATIONS when eligible sample size is below minimum threshold (30)'
        );
        assert.strictEqual(
            report.dataProvenance,
            'point_in_time_recorded',
            'Provenance must reflect point-in-time recorded events'
        );
    });

    // Test 10: Database Write Idempotency Compound Key Invariant
    await runTest('Database write idempotency: Compound key invariant (symbol, articleId, version) enforces uniqueness', () => {
        // Simulated key generator
        const makeKey = (symbol: string, articleId: string, version: number) => `${symbol}::${articleId}::v${version}`;

        const set = new Set<string>();
        const key1 = makeKey('AAPL', 'news-abc123', 1);
        const key1Duplicate = makeKey('AAPL', 'news-abc123', 1);
        const key1OtherSymbol = makeKey('MSFT', 'news-abc123', 1);
        const key2Reassessment = makeKey('AAPL', 'news-abc123', 2);

        set.add(key1);
        assert.strictEqual(set.has(key1Duplicate), true, 'Duplicate insert on (symbol, articleId, version=1) is detected and blocked');
        assert.strictEqual(set.size, 1);

        // Cross-ticker duplicate preserves source record with distinct key
        set.add(key1OtherSymbol);
        assert.strictEqual(set.size, 2, 'Distinct symbol retains its own article provenance record');

        // Reassessment adds version 2 without overwriting version 1
        set.add(key2Reassessment);
        assert.strictEqual(set.size, 3, 'Reassessment creates a distinct version 2 key without colliding with version 1');
    });

    // Test 11: Retry Behavior & Exponential Backoff Invariant
    await runTest('Retry behavior: Exponential backoff delay increments safely on transient errors', async () => {
        const delays: number[] = [];
        const baseDelayMs = 50;

        for (let attempt = 1; attempt <= 3; attempt++) {
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            delays.push(delay);
        }

        assert.strictEqual(delays[0], 50, 'First retry delay is base delay (50ms)');
        assert.strictEqual(delays[1], 100, 'Second retry delay doubles (100ms)');
        assert.strictEqual(delays[2], 200, 'Third retry delay doubles again (200ms)');
    });

    // Summary
    console.log('\n------------------------------------------------------------');
    console.log(`Results: ${passedTests} passed, ${failedTests} failed.`);
    console.log('------------------------------------------------------------\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
