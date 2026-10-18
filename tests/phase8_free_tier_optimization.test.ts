import assert from 'assert';
import { ApiClient } from '@/services/api/apiClient';
import { FinnhubMarketService } from '@/services/market/FinnhubMarketService';
import { WatchlistNewsSummarizer } from '@/services/news/WatchlistNewsSummarizer';
import { WatchlistArticle } from '@/services/news/WatchlistNewsService';
import { aiCooldownTracker } from '@/services/ai/aiErrorHandling';
import { SystemStatusService } from '@/services/system/SystemStatusService';

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

// Mock article factory
function createMockWatchlistArticle(id: string, headline: string, summary: string): WatchlistArticle {
  return {
    id,
    headline,
    summary,
    url: `https://example.com/news/${id}`,
    source: 'Financial Times',
    datetime: 1713000000000,
    relatedSymbols: ['AAPL'],
    relatedCompanies: ['Apple Inc.'],
    relevanceScore: 0.95,
  };
}

async function main() {
  console.log('\n============================================================');
  console.log('🧪 HyperStocks — Phase 8: Free-Tier Optimization & Safety Tests');
  console.log('============================================================\n');

  const originalFetch = global.fetch;

  try {
    // -------------------------------------------------------------
    // Test 1: In-Flight Promise Coalescing in ApiClient
    // -------------------------------------------------------------
    await runTest('ApiClient deduplicates identical concurrent in-flight requests', async () => {
      ApiClient.clearCache();
      ApiClient.resetCircuitBreakers();

      let fetchCount = 0;
      global.fetch = async () => {
        fetchCount++;
        // Simulate slight network delay
        await new Promise((r) => setTimeout(r, 40));
        return {
          ok: true,
          status: 200,
          json: async () => ({ symbol: 'AAPL', price: 180 }),
        } as any;
      };

      const testUrl = 'https://api.test.com/quote?symbol=AAPL';
      const [res1, res2] = await Promise.all([
        ApiClient.get<any>(testUrl),
        ApiClient.get<any>(testUrl),
      ]);

      assert.strictEqual(fetchCount, 1, 'Underlying network fetch should only be invoked once');
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res2.success, true);
      assert.strictEqual(res1.data?.price, 180);
      assert.strictEqual(res2.data?.price, 180);
    });

    // -------------------------------------------------------------
    // Test 2: In-Memory TTL Caching in ApiClient
    // -------------------------------------------------------------
    await runTest('ApiClient serves subsequent requests within TTL from in-memory cache', async () => {
      ApiClient.clearCache();

      let fetchCount = 0;
      global.fetch = async () => {
        fetchCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({ symbol: 'MSFT', price: 420, count: fetchCount }),
        } as any;
      };

      const testUrl = 'https://api.test.com/quote?symbol=MSFT';
      const res1 = await ApiClient.get<any>(testUrl, { revalidateSeconds: 60 });
      const res2 = await ApiClient.get<any>(testUrl, { revalidateSeconds: 60 });

      assert.strictEqual(fetchCount, 1, 'Fetch should only occur once due to TTL cache');
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res2.success, true);
      assert.strictEqual(res1.data?.count, 1);
      assert.strictEqual(res2.data?.count, 1);
    });

    // -------------------------------------------------------------
    // Test 3: HTTP 429 Exponential Backoff & Retry
    // -------------------------------------------------------------
    await runTest('ApiClient retries transient HTTP 429 with backoff and succeeds', async () => {
      ApiClient.clearCache();

      let attempts = 0;
      global.fetch = async () => {
        attempts++;
        if (attempts === 1) {
          return {
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            headers: new Headers({ 'retry-after': '0' }),
            json: async () => ({ error: 'Rate limit exceeded' }),
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, attempts }),
        } as any;
      };

      const result = await ApiClient.get<any>('https://api.test.com/rate-limited', {
        retries: 2,
        revalidateSeconds: 0,
      });

      assert.strictEqual(attempts, 2, 'Should have retried once after 429');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.success, true);
    });

    // -------------------------------------------------------------
    // Test 4: HTTP 403 Circuit Breaker (Finnhub Candle Safety)
    // -------------------------------------------------------------
    await runTest('ApiClient trips circuit breaker on HTTP 403 and prevents repeat calls', async () => {
      ApiClient.clearCache();
      ApiClient.resetCircuitBreakers();

      let attempts = 0;
      global.fetch = async () => {
        attempts++;
        return {
          ok: false,
          status: 403,
          statusText: 'Forbidden - Tier Not Allowed',
          text: async () => 'Forbidden',
          json: async () => ({ error: 'Forbidden' }),
        } as any;
      };

      const candleUrl = 'https://finnhub.io/api/v1/stock/candle?symbol=AAPL';

      // First call should fail with 403 and trip circuit breaker
      const res1 = await ApiClient.get(candleUrl, { retries: 1 });
      assert.strictEqual(res1.success, false);
      assert.strictEqual(res1.code, 403);
      assert.strictEqual(attempts, 1);

      // Second call must immediately return failure via circuit breaker without calling fetch
      const res2 = await ApiClient.get(candleUrl);
      assert.strictEqual(res2.success, false);
      assert.strictEqual(res2.code, 403);
      assert.ok(res2.error?.includes('circuit breaker active'));
      assert.strictEqual(attempts, 1, 'Network should NOT be queried while circuit breaker is open');
    });

    // -------------------------------------------------------------
    // Test 5: FinnhubMarketService Graceful Handling of Candle 403
    // -------------------------------------------------------------
    await runTest('FinnhubMarketService.getCandles returns safe failure cleanly when 403 circuit breaker is tripped', async () => {
      const marketService = new FinnhubMarketService('test-key');

      // Trip the candle circuit breaker explicitly
      FinnhubMarketService.tripCandleCircuitBreaker();
      assert.strictEqual(FinnhubMarketService.isCandleEndpointAvailable(), false);

      const res = await marketService.getCandles('AAPL', 'D', 1700000000, 1700100000);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 403);
      assert.ok(res.error?.includes('unavailable on the current free-tier account'));

      FinnhubMarketService.resetCandleEndpointStatus();
    });

    // -------------------------------------------------------------
    // Test 6: WatchlistNewsSummarizer Deterministic Cache Key
    // -------------------------------------------------------------
    await runTest('WatchlistNewsSummarizer generates stable content-hash cache key', () => {
      const article1 = createMockWatchlistArticle('1', 'Tech Stocks Rally', 'Tech stocks jumped 2% today on earnings.');
      const article2 = createMockWatchlistArticle('2', 'Tech Stocks Rally', 'Tech stocks jumped 2% today on earnings.');
      const articleDifferent = createMockWatchlistArticle('3', 'Tech Stocks Plunge', 'Tech stocks fell 5%.');

      const key1 = WatchlistNewsSummarizer.computeCacheKey(article1);
      const key2 = WatchlistNewsSummarizer.computeCacheKey(article2);
      const keyDiff = WatchlistNewsSummarizer.computeCacheKey(articleDifferent);

      assert.strictEqual(key1, key2, 'Identical headline & summary should generate identical cache keys');
      assert.notStrictEqual(key1, keyDiff, 'Different content must generate different cache keys');
    });

    // -------------------------------------------------------------
    // Test 7: Gemini Rate Limit Immediate Fallback Routing
    // -------------------------------------------------------------
    await runTest('WatchlistNewsSummarizer routes to deterministic fallback immediately when Gemini cooldown is active', async () => {
      const article = createMockWatchlistArticle('test-cooldown', 'Quarterly Earnings Surpass Expectations', 'Revenue was up 15%.');

      // Set cooldown tracker to active
      aiCooldownTracker.registerError({
        code: 'AI_QUOTA_EXCEEDED',
        message: 'Daily quota exhausted',
        status: 429,
        retryable: false,
        retryAfterSeconds: 3600,
      });
      assert.strictEqual(aiCooldownTracker.isCooldownActive(), true);

      const results = await WatchlistNewsSummarizer.summarizeBatch([article]);
      assert.strictEqual(results.length, 1);
      const result = results[0];

      assert.strictEqual(result.isAIGenerated, false, 'Must be marked as deterministic fallback, NOT AI generated');
      assert.strictEqual(result.isFallback, true);

      // Clear cooldown after test
      aiCooldownTracker.clear();
    });

    // -------------------------------------------------------------
    // Test 8: SystemStatusService Health Report & Provenance Legend
    // -------------------------------------------------------------
    await runTest('SystemStatusService returns complete health report and truthful provenance legend', async () => {
      const status = await SystemStatusService.getSystemStatus();

      assert.ok(['healthy', 'degraded', 'limited'].includes(status.overallHealth));
      assert.ok(status.database);
      assert.ok(status.marketData);
      assert.ok(status.aiIntelligence);
      assert.ok(status.emailDelivery);
      assert.ok(status.dataProvenanceLegend);

      // Verify legend contains all required transparent modes
      assert.strictEqual(status.dataProvenanceLegend.live, 'Direct fresh feed from provider');
      assert.strictEqual(status.dataProvenanceLegend.cached, 'Recently fetched within cache TTL');
      assert.strictEqual(status.dataProvenanceLegend.ai_generated, 'Synthesized via Google Gemini');
      assert.strictEqual(status.dataProvenanceLegend.deterministic_fallback, 'Rule-based heuristic extraction when AI is in cooldown or offline');
      assert.strictEqual(status.dataProvenanceLegend.historical_point_in_time, 'Immutable point-in-time assessment recorded at publication');
      assert.strictEqual(status.dataProvenanceLegend.insufficient_data, 'Sample size below statistical evaluation threshold');

      // Verify no secrets leaked in status
      const statusStr = JSON.stringify(status);
      assert.ok(!statusStr.includes('mongodb+srv://'));
      assert.ok(!statusStr.includes('sk_test'));
      assert.ok(!statusStr.includes('whsec_'));
    });

  } finally {
    global.fetch = originalFetch;
    ApiClient.clearCache();
    ApiClient.resetCircuitBreakers();
    aiCooldownTracker.clear();
  }

  console.log('\n============================================================');
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
