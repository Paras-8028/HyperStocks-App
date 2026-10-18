import assert from 'assert';
import crypto from 'crypto';
import {
    isValidIanaTimezone,
    isValidTimeFormat,
    isValidInterval,
    getUserLocalTimeComponents,
    isDeliveryDue,
    calculateNextDelivery,
} from '../lib/utils/scheduling';
import { verifyClerkWebhookSignature } from '../lib/utils/clerk-webhook';
import { WatchlistNewsService, WatchlistStockItem } from '../services/news/WatchlistNewsService';
import { escapeHtml, renderWatchlistNewsEmail } from '../services/email/templates/watchlistNewsEmailTemplate';

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
        const res = fn();
        if (res instanceof Promise) {
            return res
                .then(() => {
                    console.log(`  ✅ PASS: ${name}`);
                    passedTests++;
                })
                .catch((err) => {
                    console.error(`  ❌ FAIL: ${name}`);
                    console.error(err);
                });
        } else {
            console.log(`  ✅ PASS: ${name}`);
            passedTests++;
        }
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(err);
    }
}

async function main() {
    console.log('\n============================================================');
    console.log('🧪 HyperStocks — Phase 2 Automated Verification Suite');
    console.log('============================================================\n');

    // -------------------------------------------------------------------------
    // 1. IDENTITY & CLERK WEBHOOK VERIFICATION
    // -------------------------------------------------------------------------
    console.log('--- Suite 1: Identity & Clerk Webhook ---');

    await runTest('Valid Svix signature passes verification', () => {
        const rawSecret = 'test_secret_key_1234567890abcdef';
        const base64Secret = Buffer.from(rawSecret).toString('base64');
        const svixSecret = `whsec_${base64Secret}`;

        const payload = JSON.stringify({ type: 'user.created', data: { id: 'user_123' } });
        const svixId = 'msg_test_001';
        const svixTimestamp = Math.floor(Date.now() / 1000).toString();

        const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
        const sig = crypto
            .createHmac('sha256', Buffer.from(base64Secret, 'base64'))
            .update(signedContent)
            .digest('base64');

        const headers = {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': `v1,${sig}`,
        };

        const isValid = verifyClerkWebhookSignature({
            payload,
            headers,
            secret: svixSecret,
        });

        assert.strictEqual(isValid, true, 'Valid signature should verify successfully');
    });

    await runTest('Invalid Svix signature is rejected', () => {
        const base64Secret = Buffer.from('test_secret_key_1234567890abcdef').toString('base64');
        const svixSecret = `whsec_${base64Secret}`;

        const payload = JSON.stringify({ type: 'user.created', data: { id: 'user_123' } });
        const headers = {
            'svix-id': 'msg_test_001',
            'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
            'svix-signature': 'v1,tampered_signature_xyz',
        };

        const isValid = verifyClerkWebhookSignature({
            payload,
            headers,
            secret: svixSecret,
        });

        assert.strictEqual(isValid, false, 'Tampered signature must be rejected');
    });

    await runTest('Expired Svix timestamp (replay attack) is rejected', () => {
        const base64Secret = Buffer.from('test_secret_key_1234567890abcdef').toString('base64');
        const svixSecret = `whsec_${base64Secret}`;

        const payload = JSON.stringify({ type: 'user.created', data: { id: 'user_123' } });
        const svixId = 'msg_test_old';
        // 10 minutes ago (> 300 seconds)
        const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();

        const signedContent = `${svixId}.${oldTimestamp}.${payload}`;
        const sig = crypto
            .createHmac('sha256', Buffer.from(base64Secret, 'base64'))
            .update(signedContent)
            .digest('base64');

        const headers = {
            'svix-id': svixId,
            'svix-timestamp': oldTimestamp,
            'svix-signature': `v1,${sig}`,
        };

        const isValid = verifyClerkWebhookSignature({
            payload,
            headers,
            secret: svixSecret,
        });

        assert.strictEqual(isValid, false, 'Expired timestamp must be rejected');
    });

    // -------------------------------------------------------------------------
    // 2. PREFERENCES & TIMEZONE-AWARE SCHEDULING
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 2: Preferences & Timezone-Aware Scheduling ---');

    await runTest('Timezone and time validators enforce strict IANA and HH:mm formats', () => {
        assert.strictEqual(isValidIanaTimezone('Asia/Kolkata'), true);
        assert.strictEqual(isValidIanaTimezone('America/New_York'), true);
        assert.strictEqual(isValidIanaTimezone('Europe/London'), true);
        assert.strictEqual(isValidIanaTimezone('Invalid/Timezone_XYZ'), false);
        assert.strictEqual(isValidIanaTimezone(''), false);

        assert.strictEqual(isValidTimeFormat('08:00'), true);
        assert.strictEqual(isValidTimeFormat('23:59'), true);
        assert.strictEqual(isValidTimeFormat('00:00'), true);
        assert.strictEqual(isValidTimeFormat('24:00'), false);
        assert.strictEqual(isValidTimeFormat('8:00'), false);
        assert.strictEqual(isValidTimeFormat('invalid'), false);

        assert.strictEqual(isValidInterval(30), true);
        assert.strictEqual(isValidInterval(240), true);
        assert.strictEqual(isValidInterval(1440), true);
        assert.strictEqual(isValidInterval(15), false); // Too frequent
        assert.strictEqual(isValidInterval(2000), false);
    });

    await runTest('Disabled newsEmailEnabled user is skipped', () => {
        const user = {
            userId: 'user_disabled',
            email: 'user@example.com',
            newsEmailEnabled: false,
            timezone: 'Asia/Kolkata',
            deliveryMode: 'daily' as const,
            preferredDeliveryTime: '08:00',
        };

        const res = isDeliveryDue(user, new Date());
        assert.strictEqual(res.isDue, false);
        assert.strictEqual(res.reason, 'news_emails_disabled');
    });

    await runTest('Paused schedule is skipped', () => {
        const user = {
            userId: 'user_paused',
            email: 'user@example.com',
            newsEmailEnabled: true,
            isSchedulePaused: true,
            timezone: 'Asia/Kolkata',
            deliveryMode: 'daily' as const,
            preferredDeliveryTime: '08:00',
        };

        const res = isDeliveryDue(user, new Date());
        assert.strictEqual(res.isDue, false);
        assert.strictEqual(res.reason, 'schedule_paused');
    });

    await runTest('User without email is skipped', () => {
        const user = {
            userId: 'user_no_email',
            email: '',
            newsEmailEnabled: true,
            timezone: 'Asia/Kolkata',
        };

        const res = isDeliveryDue(user, new Date());
        assert.strictEqual(res.isDue, false);
        assert.strictEqual(res.reason, 'invalid_or_missing_email');
    });

    await runTest('Daily delivery uses user local time accurately (Asia/Kolkata)', () => {
        // Create reference UTC date that corresponds to 08:30 in Asia/Kolkata
        // 08:30 IST is 03:00 UTC (IST is UTC+5:30)
        // Set date to a Monday: 2026-10-19 03:00:00 UTC
        const refDate = new Date('2026-10-19T03:00:00Z');

        const local = getUserLocalTimeComponents(refDate, 'Asia/Kolkata');
        assert.strictEqual(local.hour, 8, 'Local hour in IST should be 8');
        assert.strictEqual(local.minute, 30, 'Local minute in IST should be 30');
        assert.strictEqual(local.dayOfWeek, 1, 'Local day of week should be Monday (1)');

        const user = {
            userId: 'user_kolkata',
            email: 'kolkata@example.com',
            newsEmailEnabled: true,
            timezone: 'Asia/Kolkata',
            deliveryMode: 'daily' as const,
            preferredDeliveryTime: '08:00',
            deliveryDays: [1, 2, 3, 4, 5],
        };

        const res = isDeliveryDue(user, refDate);
        assert.strictEqual(res.isDue, true, 'User should be due at their local hour');
        assert.strictEqual(res.idempotencyKey, 'user_kolkata:daily:2026-10-19');
    });

    await runTest('DST-observing timezone (America/New_York) computes correct local clock hour', () => {
        // EDT is UTC-4 in October (before Nov DST change)
        // 12:00 UTC corresponds to 08:00 EDT in New York
        const edtDate = new Date('2026-10-19T12:00:00Z');
        const localEdt = getUserLocalTimeComponents(edtDate, 'America/New_York');
        assert.strictEqual(localEdt.hour, 8, 'Local hour in New York should be 8 EDT');

        const user = {
            userId: 'user_ny',
            email: 'ny@example.com',
            newsEmailEnabled: true,
            timezone: 'America/New_York',
            deliveryMode: 'daily' as const,
            preferredDeliveryTime: '08:00',
            deliveryDays: [1, 2, 3, 4, 5],
        };

        const res = isDeliveryDue(user, edtDate);
        assert.strictEqual(res.isDue, true);
        assert.strictEqual(res.idempotencyKey, 'user_ny:daily:2026-10-19');
    });

    await runTest('Repeated dispatcher run in same delivery window is rejected (Idempotency)', () => {
        const refDate = new Date('2026-10-19T03:00:00Z'); // 08:30 IST

        const user = {
            userId: 'user_repeat',
            email: 'repeat@example.com',
            newsEmailEnabled: true,
            timezone: 'Asia/Kolkata',
            deliveryMode: 'daily' as const,
            preferredDeliveryTime: '08:00',
            deliveryDays: [1, 2, 3, 4, 5],
            // Already sent on 2026-10-19 08:05 IST
            lastNewsDeliveryAt: new Date('2026-10-19T02:35:00Z'),
        };

        const res = isDeliveryDue(user, refDate);
        assert.strictEqual(res.isDue, false, 'Should not deliver twice on the same day');
        assert.strictEqual(res.reason?.startsWith('already_delivered_today'), true);
    });

    await runTest('Interval schedule eligibility evaluates elapsed time correctly', () => {
        const now = new Date('2026-10-19T12:00:00Z');

        // Case 1: First delivery (never delivered before)
        const userFirst = {
            userId: 'user_interval_1',
            email: 'int1@example.com',
            deliveryMode: 'interval' as const,
            scheduleIntervalMinutes: 120,
        };
        const resFirst = isDeliveryDue(userFirst, now);
        assert.strictEqual(resFirst.isDue, true, 'First interval delivery must be due');

        // Case 2: 60 mins elapsed when interval is 120 mins -> Not due
        const userRecent = {
            userId: 'user_interval_2',
            email: 'int2@example.com',
            deliveryMode: 'interval' as const,
            scheduleIntervalMinutes: 120,
            lastNewsDeliveryAt: new Date(now.getTime() - 60 * 60 * 1000),
        };
        const resRecent = isDeliveryDue(userRecent, now);
        assert.strictEqual(resRecent.isDue, false, 'Recent interval should not be due');

        // Case 3: 130 mins elapsed when interval is 120 mins -> Due
        const userDue = {
            userId: 'user_interval_3',
            email: 'int3@example.com',
            deliveryMode: 'interval' as const,
            scheduleIntervalMinutes: 120,
            lastNewsDeliveryAt: new Date(now.getTime() - 130 * 60 * 1000),
        };
        const resDue = isDeliveryDue(userDue, now);
        assert.strictEqual(resDue.isDue, true, 'Elapsed interval must be due');
    });

    await runTest('Empty watchlist returns empty_watchlist status without API calls', async () => {
        const service = new WatchlistNewsService('dummy_token');
        const emptyItems: WatchlistStockItem[] = [];

        const result = await service.getPersonalizedWatchlistNews(emptyItems);
        assert.strictEqual(result.status, 'empty_watchlist');
        assert.strictEqual(result.articles.length, 0);
    });

    // -------------------------------------------------------------------------
    // 3. PERSONALIZATION, ISOLATION & BATCH NEWS RETRIEVAL
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 3: Personalization, Isolation & Batch Retrieval ---');

    await runTest('Two users receive only their own watchlist news (Strict Isolation)', () => {
        const service = new WatchlistNewsService('dummy_token');

        // Mock shared news data for distinct tickers AAPL and TSLA
        const mockNewsMap = new Map<string, any[]>([
            [
                'AAPL',
                [
                    {
                        id: 'aapl_1',
                        headline: 'Apple Unveils New Silicon Chip Architecture',
                        summary: 'Apple Inc. announces M4 performance milestones.',
                        source: 'TechWire',
                        url: 'https://example.com/news/aapl-1',
                        datetime: Math.floor(Date.now() / 1000) - 3600,
                    },
                ],
            ],
            [
                'TSLA',
                [
                    {
                        id: 'tsla_1',
                        headline: 'Tesla Reports Record Vehicle Production Numbers',
                        summary: 'Tesla quarterly deliveries beat institutional expectations.',
                        source: 'AutoDaily',
                        url: 'https://example.com/news/tsla-1',
                        datetime: Math.floor(Date.now() / 1000) - 7200,
                    },
                ],
            ],
        ]);

        const userAWatchlist = [{ symbol: 'AAPL', company: 'Apple Inc.' }];
        const userBWatchlist = [{ symbol: 'TSLA', company: 'Tesla Inc.' }];

        const userAResult = service.filterAndRankNewsForWatchlist(userAWatchlist, mockNewsMap);
        const userBResult = service.filterAndRankNewsForWatchlist(userBWatchlist, mockNewsMap);

        // Verify User A receives ONLY Apple news
        assert.strictEqual(userAResult.status, 'success');
        assert.strictEqual(userAResult.articles.length, 1);
        assert.strictEqual(userAResult.articles[0].relatedSymbols.includes('AAPL'), true);
        assert.strictEqual(userAResult.articles[0].relatedSymbols.includes('TSLA'), false);

        // Verify User B receives ONLY Tesla news
        assert.strictEqual(userBResult.status, 'success');
        assert.strictEqual(userBResult.articles.length, 1);
        assert.strictEqual(userBResult.articles[0].relatedSymbols.includes('TSLA'), true);
        assert.strictEqual(userBResult.articles[0].relatedSymbols.includes('AAPL'), false);
    });

    await runTest('Shared tickers in a batch reuse news cache safely', () => {
        const service = new WatchlistNewsService('dummy_token');

        // User A watches AAPL and MSFT
        // User B watches MSFT and NVDA
        // Distinct tickers = AAPL, MSFT, NVDA
        const mockNewsMap = new Map<string, any[]>([
            [
                'MSFT',
                [
                    {
                        id: 'msft_1',
                        headline: 'Microsoft Expands Enterprise Cloud Infrastructure Partnerships',
                        summary: 'Microsoft Corp signs multi-year enterprise contracts.',
                        source: 'CloudBiz',
                        url: 'https://example.com/msft-1',
                        datetime: Math.floor(Date.now() / 1000) - 1000,
                    },
                ],
            ],
            ['AAPL', []],
            ['NVDA', []],
        ]);

        const userA = [{ symbol: 'AAPL', company: 'Apple' }, { symbol: 'MSFT', company: 'Microsoft' }];
        const userB = [{ symbol: 'MSFT', company: 'Microsoft' }, { symbol: 'NVDA', company: 'NVIDIA' }];

        const resA = service.filterAndRankNewsForWatchlist(userA, mockNewsMap);
        const resB = service.filterAndRankNewsForWatchlist(userB, mockNewsMap);

        // Both received the shared MSFT article
        assert.strictEqual(resA.articles.length, 1);
        assert.strictEqual(resA.articles[0].relatedSymbols.includes('MSFT'), true);

        assert.strictEqual(resB.articles.length, 1);
        assert.strictEqual(resB.articles[0].relatedSymbols.includes('MSFT'), true);
    });

    await runTest('Email HTML renderer sanitizes malicious scripts and untrusted content', () => {
        const maliciousHeadline = '<script>alert("XSS")</script>Apple Earnings Surge <img src="x" onerror="alert(1)">';
        const escaped = escapeHtml(maliciousHeadline);

        assert.strictEqual(escaped.includes('<script>'), false);
        assert.strictEqual(escaped.includes('&lt;script&gt;'), true);
        assert.strictEqual(escaped.includes('&lt;img'), true);

        // Render template with malicious article
        const { html } = renderWatchlistNewsEmail({
            recipientName: 'Test Investor',
            recipientEmail: 'test@example.com',
            dateStr: 'Monday, Oct 19, 2026',
            result: {
                status: 'success',
                articles: [
                    {
                        id: 'xss_test',
                        headline: maliciousHeadline,
                        summary: 'Safe summary description with <b>untrusted tags</b>',
                        source: 'Financial Wire',
                        url: 'javascript:alert(1)',
                        datetime: Date.now(),
                        relatedSymbols: ['AAPL'],
                        relatedCompanies: ['Apple'],
                        relevanceScore: 25,
                    },
                ],
                allTrackedSymbols: ['AAPL'],
                allTrackedCompanies: { AAPL: 'Apple' },
                symbolsWithNews: ['AAPL'],
                symbolsWithoutNews: [],
            },
        });

        // Ensure raw unescaped script tags and javascript: URLs are not executed
        assert.strictEqual(html.includes('<script>alert'), false);
        assert.strictEqual(html.includes('href="javascript:'), false);
    });

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n============================================================');
    console.log(`📊 Automated Test Results: ${passedTests}/${totalTests} Passed`);
    console.log('============================================================\n');

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

main().catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
});
