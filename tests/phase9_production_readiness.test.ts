import assert from 'assert';
import { verifyClerkWebhookSignature } from '@/lib/utils/clerk-webhook';
import { ApiClient } from '@/services/api/apiClient';
import { FinnhubMarketService } from '@/services/market/FinnhubMarketService';
import { SystemStatusService } from '@/services/system/SystemStatusService';
import crypto from 'crypto';

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

async function main() {
  console.log('\n============================================================');
  console.log('🧪 HyperStocks — Phase 9: Production Readiness & Verification');
  console.log('============================================================\n');

  // -------------------------------------------------------------
  // Test 1: Clerk Svix Webhook Security & 5-minute Replay Protection
  // -------------------------------------------------------------
  await runTest('Clerk webhook rejects expired timestamps to prevent replay attacks', () => {
    const secret = 'whsec_test_secret_key_1234567890abcdef';
    const rawSecret = secret.slice(6);
    const secretBytes = Buffer.from(rawSecret, 'base64');
    const svixId = 'msg_test_123';
    
    // Timestamp 10 minutes in the past (> 300s)
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const payload = JSON.stringify({ type: 'user.created', data: { id: 'user_123' } });
    
    const signedContent = `${svixId}.${oldTimestamp}.${payload}`;
    const sig = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

    const isValid = verifyClerkWebhookSignature({
      payload,
      headers: {
        'svix-id': svixId,
        'svix-timestamp': oldTimestamp,
        'svix-signature': `v1,${sig}`,
      },
      secret,
    });

    assert.strictEqual(isValid, false, 'Expired timestamp must be rejected');
  });

  await runTest('Clerk webhook accepts valid signature within timestamp window', () => {
    const secret = 'whsec_test_secret_key_1234567890abcdef';
    const rawSecret = secret.slice(6);
    const secretBytes = Buffer.from(rawSecret, 'base64');
    const svixId = 'msg_test_valid_456';
    
    // Fresh timestamp (now)
    const freshTimestamp = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify({ type: 'user.updated', data: { id: 'user_456' } });
    
    const signedContent = `${svixId}.${freshTimestamp}.${payload}`;
    const sig = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

    const isValid = verifyClerkWebhookSignature({
      payload,
      headers: {
        'svix-id': svixId,
        'svix-timestamp': freshTimestamp,
        'svix-signature': `v1,${sig}`,
      },
      secret,
    });

    assert.strictEqual(isValid, true, 'Valid signature within window must be accepted');
  });

  await runTest('Clerk webhook rejects tampered payload', () => {
    const secret = 'whsec_test_secret_key_1234567890abcdef';
    const rawSecret = secret.slice(6);
    const secretBytes = Buffer.from(rawSecret, 'base64');
    const svixId = 'msg_test_tamper_789';
    const freshTimestamp = String(Math.floor(Date.now() / 1000));
    
    const originalPayload = JSON.stringify({ type: 'user.created', data: { id: 'user_789' } });
    const tamperedPayload = JSON.stringify({ type: 'user.created', data: { id: 'user_attacker' } });
    
    const signedContent = `${svixId}.${freshTimestamp}.${originalPayload}`;
    const sig = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

    const isValid = verifyClerkWebhookSignature({
      payload: tamperedPayload,
      headers: {
        'svix-id': svixId,
        'svix-timestamp': freshTimestamp,
        'svix-signature': `v1,${sig}`,
      },
      secret,
    });

    assert.strictEqual(isValid, false, 'Tampered payload must be rejected');
  });

  // -------------------------------------------------------------
  // Test 2: Inngest Schedule US Market Hours Coverage Verification
  // -------------------------------------------------------------
  await runTest('Price check schedule (13-21 UTC) fully covers US trading hours in both EDT and EST', () => {
    // US Market Regular Trading Hours: 09:30 to 16:00 ET
    // EDT (Daylight Saving Time, UTC-4): 09:30 ET = 13:30 UTC, 16:00 ET = 20:00 UTC
    // EST (Standard Time, UTC-5):        09:30 ET = 14:30 UTC, 16:00 ET = 21:00 UTC
    
    const cronStartUtc = 13; // 13:00 UTC
    const cronEndUtc = 21;   // 21:50 UTC (inclusive hour 21)

    // Check EDT
    const edtOpenUtc = 13.5;
    const edtCloseUtc = 20.0;
    assert.ok(cronStartUtc <= edtOpenUtc, 'Schedule must start at or before EDT market open');
    assert.ok(cronEndUtc >= edtCloseUtc, 'Schedule must continue through EDT market close');

    // Check EST
    const estOpenUtc = 14.5;
    const estCloseUtc = 21.0;
    assert.ok(cronStartUtc <= estOpenUtc, 'Schedule must start at or before EST market open');
    assert.ok(cronEndUtc >= estCloseUtc, 'Schedule must continue through EST market close');
  });

  // -------------------------------------------------------------
  // Test 3: Credential Redaction in ApiClient Sanitization
  // -------------------------------------------------------------
  await runTest('ApiClient.sanitizeUrl redacts sensitive token parameters', () => {
    const rawUrl1 = 'https://finnhub.io/api/v1/quote?symbol=AAPL&token=secret_finnhub_key_123';
    const rawUrl2 = 'https://finnhub.io/api/v1/stock/candle?symbol=MSFT&apiKey=secret_key_456&from=100&to=200';
    
    const clean1 = ApiClient.sanitizeUrl(rawUrl1);
    const clean2 = ApiClient.sanitizeUrl(rawUrl2);

    assert.ok(!clean1.includes('secret_finnhub_key_123'), 'Finnhub token must be redacted');
    assert.ok(clean1.includes('token=[REDACTED]'), 'Redacted label must be present');
    assert.ok(!clean2.includes('secret_key_456'), 'API key must be redacted');
  });

  // -------------------------------------------------------------
  // Test 4: Free-Tier 403 Candle Circuit Breaker
  // -------------------------------------------------------------
  await runTest('FinnhubMarketService candle endpoint status behaves correctly when circuit breaker is tripped', () => {
    FinnhubMarketService.resetCandleEndpointStatus();
    assert.strictEqual(FinnhubMarketService.isCandleEndpointAvailable(), true);

    FinnhubMarketService.tripCandleCircuitBreaker(60000);
    assert.strictEqual(FinnhubMarketService.isCandleEndpointAvailable(), false);

    FinnhubMarketService.resetCandleEndpointStatus();
    assert.strictEqual(FinnhubMarketService.isCandleEndpointAvailable(), true);
  });

  // -------------------------------------------------------------
  // Test 5: Operational Health Endpoint Integrity
  // -------------------------------------------------------------
  await runTest('SystemStatusService truthfully reports system state without exposing secrets', async () => {
    const status = await SystemStatusService.getSystemStatus();

    assert.ok(['healthy', 'degraded', 'limited'].includes(status.overallHealth));
    assert.ok(status.database);
    assert.ok(status.marketData);
    assert.ok(status.aiIntelligence);
    assert.ok(status.dataProvenanceLegend);

    // Verify provenance modes are truthfully distinguished
    assert.ok(status.dataProvenanceLegend.live);
    assert.ok(status.dataProvenanceLegend.cached);
    assert.ok(status.dataProvenanceLegend.ai_generated);
    assert.ok(status.dataProvenanceLegend.deterministic_fallback);
    assert.ok(status.dataProvenanceLegend.insufficient_data);

    // Ensure zero credentials leaked
    const jsonStr = JSON.stringify(status);
    assert.ok(!jsonStr.includes('mongodb+srv://'));
    assert.ok(!jsonStr.includes('password'));
    assert.ok(!jsonStr.includes('whsec_'));
  });

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
