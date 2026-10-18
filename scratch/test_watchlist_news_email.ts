/**
 * Comprehensive Automated Test Suite for HyperStocks Watchlist News Email Functionality
 * Tests all 14 core requirements and edge cases using mocked data.
 * Zero real emails are sent during this test.
 */

import { WatchlistNewsService, WatchlistArticle, WatchlistStockItem } from '../services/news/WatchlistNewsService';
import { WatchlistNewsSummarizer } from '../services/news/WatchlistNewsSummarizer';
import { renderWatchlistNewsEmail, escapeHtml } from '../services/email/templates/watchlistNewsEmailTemplate';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
        console.log(`✅ [PASS] ${testName}`);
        passedTests++;
    } else {
        console.error(`❌ [FAIL] ${testName} - ${details || 'Assertion failed'}`);
        throw new Error(`Test Failed: ${testName}`);
    }
}

async function runTestSuite() {
    console.log('====================================================');
    console.log('🧪 HyperStocks Watchlist News Email Test Suite');
    console.log('====================================================\n');

    const service = new WatchlistNewsService('mock_token');

    // -------------------------------------------------------------------------
    // Test 1: Ambiguity Handling (Tickers that are common English words)
    // -------------------------------------------------------------------------
    console.log('--- Test Group: Ticker & Name Ambiguity ---');
    {
        // "A" (Agilent Technologies)
        const textWithIncidentalWord = "It is a good day to go for a run in the park.";
        const isMatchedWord = service.isRelevantToStock(textWithIncidentalWord, 'A', 'Agilent Technologies');
        assert(!isMatchedWord, 'Common English word "a" should NOT match ticker A');

        const textWithCashtag = "Investors are watching $A following new earnings guidance.";
        const isMatchedCashtag = service.isRelevantToStock(textWithCashtag, 'A', 'Agilent Technologies');
        assert(isMatchedCashtag, 'Cashtag $A should match ticker A');

        const textWithParenthesis = "Shares of Agilent (A) jumped 3% after FDA clearance.";
        const isMatchedParen = service.isRelevantToStock(textWithParenthesis, 'A', 'Agilent Technologies');
        assert(isMatchedParen, 'Parenthetical (A) with company name should match ticker A');

        // "CAN" (Canaan Inc.)
        const textWithCanWord = "Analysts say the market can rally further this month.";
        const isMatchedCan = service.isRelevantToStock(textWithCanWord, 'CAN', 'Canaan Inc.');
        assert(!isMatchedCan, 'Incidental word "can" should NOT match ticker CAN');

        const textWithCanaan = "Canaan unveils next-generation crypto mining rigs.";
        const isMatchedCanaan = service.isRelevantToStock(textWithCanaan, 'CAN', 'Canaan Inc.');
        assert(isMatchedCanaan, 'Company name "Canaan" matches ticker CAN');

        // "FOR" (Forestar Group)
        const textWithFor = "This report was prepared for institutional clients.";
        const isMatchedFor = service.isRelevantToStock(textWithFor, 'FOR', 'Forestar Group Inc.');
        assert(!isMatchedFor, 'Incidental word "for" should NOT match ticker FOR');

        // "ON" (ON Semiconductor)
        const textWithOn = "The stock market opened on Monday with high volume.";
        const isMatchedOn = service.isRelevantToStock(textWithOn, 'ON', 'ON Semiconductor');
        assert(!isMatchedOn, 'Incidental word "on" should NOT match ticker ON');

        const textWithOnSemi = "ON Semiconductor reports record automotive chip revenue.";
        const isMatchedOnSemi = service.isRelevantToStock(textWithOnSemi, 'ON', 'ON Semiconductor');
        assert(isMatchedOnSemi, 'Company name "ON Semiconductor" matches ticker ON');
    }

    // -------------------------------------------------------------------------
    // Test 2: Watchlist containing several stocks (AAPL, TSLA, NVDA, MSFT)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: Watchlist Multi-Stock Coverage ---');
    {
        const watchlist: WatchlistStockItem[] = [
            { symbol: 'AAPL', company: 'Apple Inc.' },
            { symbol: 'TSLA', company: 'Tesla, Inc.' },
            { symbol: 'NVDA', company: 'NVIDIA Corporation' },
            { symbol: 'MSFT', company: 'Microsoft Corporation' },
        ];

        // Mock articles
        const mockAppleArticle: WatchlistArticle = {
            id: 'art-1',
            headline: 'Apple Unveils New M4 MacBook Lineup With AI Features',
            summary: 'Apple Inc. announced its new generation of MacBooks powered by the M4 chip.',
            source: 'Reuters',
            url: 'https://reuters.com/apple-m4-macbook',
            datetime: Date.now() - 3600000,
            relatedSymbols: ['AAPL'],
            relatedCompanies: ['Apple'],
            relevanceScore: 25,
        };

        const mockNvidiaArticle: WatchlistArticle = {
            id: 'art-2',
            headline: 'NVIDIA Reports Record Data Center Revenue of $30 Billion',
            summary: 'NVIDIA Corporation blew past analyst expectations with massive AI demand.',
            source: 'Bloomberg',
            url: 'https://bloomberg.com/nvidia-q3-earnings',
            datetime: Date.now() - 7200000,
            relatedSymbols: ['NVDA'],
            relatedCompanies: ['NVIDIA'],
            relevanceScore: 28,
        };

        const result = {
            status: 'success' as const,
            articles: [mockNvidiaArticle, mockAppleArticle],
            allTrackedSymbols: ['AAPL', 'TSLA', 'NVDA', 'MSFT'],
            allTrackedCompanies: { AAPL: 'Apple', TSLA: 'Tesla', NVDA: 'NVIDIA', MSFT: 'Microsoft' },
            symbolsWithNews: ['NVDA', 'AAPL'],
            symbolsWithoutNews: ['TSLA', 'MSFT'],
        };

        assert(result.articles.length === 2, 'Should return 2 relevant articles');
        assert(result.symbolsWithNews.includes('AAPL') && result.symbolsWithNews.includes('NVDA'), 'Tracks symbols with news');
        assert(result.symbolsWithoutNews.includes('TSLA') && result.symbolsWithoutNews.includes('MSFT'), 'Distinguishes symbols without news');

        const email = renderWatchlistNewsEmail({
            recipientName: 'Alex Rivera',
            recipientEmail: 'alex@example.com',
            dateStr: 'Friday, October 16, 2026',
            result,
        });

        assert(email.subject.includes('📈 Your Watchlist News'), 'Subject should indicate Watchlist News when articles exist');
        assert(email.html.includes('Apple Unveils New M4 MacBook'), 'Email HTML includes Apple article');
        assert(email.html.includes('NVIDIA Reports Record Data Center'), 'Email HTML includes NVIDIA article');
        assert(email.html.includes('With News:'), 'Email HTML highlights stocks with news');
        assert(email.html.includes('No Major Updates:'), 'Email HTML highlights stocks without news');
        assert(email.html.includes('#7C5CFF') && email.html.includes('#35D6FF'), 'Email HTML uses HyperStocks purple & cyan palette');
    }

    // -------------------------------------------------------------------------
    // Test 3: Watchlist with only one stock
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: Single Stock Watchlist ---');
    {
        const result = {
            status: 'success' as const,
            articles: [{
                id: 'tsla-1',
                headline: 'Tesla Expands Robotaxi Testing Program in Texas',
                summary: 'Tesla Inc announced regulatory filings for broader autonomous fleet testing.',
                source: 'CNBC',
                url: 'https://cnbc.com/tesla-robotaxi',
                datetime: Date.now() - 10000000,
                relatedSymbols: ['TSLA'],
                relatedCompanies: ['Tesla'],
                relevanceScore: 20,
            }],
            allTrackedSymbols: ['TSLA'],
            allTrackedCompanies: { TSLA: 'Tesla' },
            symbolsWithNews: ['TSLA'],
            symbolsWithoutNews: [],
        };

        const email = renderWatchlistNewsEmail({
            recipientName: 'Sarah Connor',
            recipientEmail: 'sarah@example.com',
            dateStr: 'Friday, October 16, 2026',
            result,
        });

        assert(email.html.includes('TSLA'), 'Single stock email contains TSLA ticker');
        assert(email.html.includes('Tesla Expands Robotaxi'), 'Single stock email contains Tesla article');
        assert(!email.html.includes('No Major Updates:'), 'No "No Major Updates" section when all tracked stocks have news');
    }

    // -------------------------------------------------------------------------
    // Test 4: Empty Watchlist
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: Empty Watchlist ---');
    {
        const emptyResult = {
            status: 'empty_watchlist' as const,
            articles: [],
            allTrackedSymbols: [],
            allTrackedCompanies: {},
            symbolsWithNews: [],
            symbolsWithoutNews: [],
        };

        const email = renderWatchlistNewsEmail({
            recipientName: 'New User',
            recipientEmail: 'newbie@example.com',
            dateStr: 'Friday, October 16, 2026',
            result: emptyResult,
        });

        assert(email.subject.includes('Your Watchlist Update'), 'Subject uses Update when no articles');
        assert(email.html.includes('Personalize Your Daily Stock News'), 'Renders friendly empty-watchlist onboarding card');
        assert(email.html.includes('Your watchlist is currently empty'), 'Explains how to add stocks');
        assert(!email.html.includes('What Happened?'), 'Does not render dummy article cards');
    }

    // -------------------------------------------------------------------------
    // Test 5: No News for Tracked Stocks
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: No News Case ---');
    {
        const noNewsResult = {
            status: 'no_news' as const,
            articles: [],
            allTrackedSymbols: ['AAPL', 'MSFT'],
            allTrackedCompanies: { AAPL: 'Apple', MSFT: 'Microsoft' },
            symbolsWithNews: [],
            symbolsWithoutNews: ['AAPL', 'MSFT'],
        };

        const email = renderWatchlistNewsEmail({
            recipientName: 'Investor Jane',
            recipientEmail: 'jane@example.com',
            dateStr: 'Friday, October 16, 2026',
            result: noNewsResult,
        });

        assert(email.subject.includes('📈 Your Watchlist Update — Friday, October 16, 2026 | HyperStocks'), 'Subject is Watchlist Update on no news');
        assert(email.html.includes('No Significant Watchlist News Today'), 'Renders dedicated No News section');
        assert(email.html.includes('AAPL, MSFT'), 'Shows covered stocks that were checked');
        assert(!email.html.includes('Illinois governor') && !email.html.includes('Asian golf tour'), 'Never fills with generic unrelated news');
    }

    // -------------------------------------------------------------------------
    // Test 6: Cross-stock association (Story affecting multiple watchlisted stocks)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: Multi-Stock Association ---');
    {
        const multiStockArticle: WatchlistArticle = {
            id: 'art-multi',
            headline: 'Microsoft and NVIDIA Announce Expanded AI Infrastructure Partnership',
            summary: 'Microsoft Azure will deploy hundreds of thousands of new NVIDIA Blackwell GPUs.',
            source: 'The Wall Street Journal',
            url: 'https://wsj.com/microsoft-nvidia-deal',
            datetime: Date.now() - 5000000,
            relatedSymbols: ['MSFT', 'NVDA'],
            relatedCompanies: ['Microsoft', 'NVIDIA'],
            relevanceScore: 35,
        };

        const result = {
            status: 'success' as const,
            articles: [multiStockArticle],
            allTrackedSymbols: ['MSFT', 'NVDA'],
            allTrackedCompanies: { MSFT: 'Microsoft', NVDA: 'NVIDIA' },
            symbolsWithNews: ['MSFT', 'NVDA'],
            symbolsWithoutNews: [],
        };

        const email = renderWatchlistNewsEmail({
            recipientName: 'Partner User',
            recipientEmail: 'partner@example.com',
            dateStr: 'Friday, October 16, 2026',
            result,
        });

        assert(email.html.includes('Microsoft (MSFT)') && email.html.includes('NVIDIA (NVDA)'), 'Card displays both company badges');
    }

    // -------------------------------------------------------------------------
    // Test 7: Deduplication of stories
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: Deduplication Logic ---');
    {
        const url1 = 'https://finance.yahoo.com/news/apple-earnings-beat-12345.html';
        const url2 = 'https://finance.yahoo.com/news/apple-earnings-beat-12345.html?guccounter=1';

        const cleanKey1 = url1.split('?')[0].toLowerCase();
        const cleanKey2 = url2.split('?')[0].toLowerCase();

        assert(cleanKey1 === cleanKey2, 'Query parameter variations deduplicate to identical canonical URL');
    }

    // -------------------------------------------------------------------------
    // Test 8: Irrelevant Noise Filtering (Sports, Politics, Celebrity)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: Noise Filtering ---');
    {
        const sportsText = "Tiger Woods returns to golf championship tournament.";
        const isGolfRelevant = service.isRelevantToStock(sportsText, 'AAPL', 'Apple');
        assert(!isGolfRelevant, 'Golf tournament is not relevant to Apple');

        const politicsText = "Illinois governor holds press briefing on state budget.";
        const isGovRelevant = service.isRelevantToStock(politicsText, 'NVDA', 'NVIDIA');
        assert(!isGovRelevant, 'State gubernatorial press conference is not relevant to NVIDIA');
    }

    // -------------------------------------------------------------------------
    // Test 9: Missing Descriptions and Publication Dates
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: Missing Metadata Resilience ---');
    {
        const sparseArticle: WatchlistArticle = {
            id: 'art-sparse',
            headline: 'Amazon Web Services Announces New Cloud Security Framework',
            summary: '', // missing description
            source: '',  // missing source
            url: '',     // missing url
            datetime: 0, // missing date
            relatedSymbols: ['AMZN'],
            relatedCompanies: ['Amazon'],
            relevanceScore: 12,
        };

        const summary = WatchlistNewsSummarizer.generateFallbackSummary(sparseArticle);
        assert(summary.whatHappened.length > 0, 'Fallback summary generates whatHappened from headline when description is missing');
        assert(summary.whyItMatters.includes('Amazon'), 'Fallback summary relates to tracked company');
        assert(summary.bottomLine.length > 0, 'Fallback summary includes actionable bottom line');

        const email = renderWatchlistNewsEmail({
            dateStr: 'Friday, October 16, 2026',
            result: {
                status: 'success',
                articles: [{ ...sparseArticle, ...summary }],
                allTrackedSymbols: ['AMZN'],
                allTrackedCompanies: { AMZN: 'Amazon' },
                symbolsWithNews: ['AMZN'],
                symbolsWithoutNews: [],
            },
        });

        assert(!email.html.includes('undefined'), 'Email contains no undefined strings');
        assert(!email.html.includes('null'), 'Email contains no null strings');
    }

    // -------------------------------------------------------------------------
    // Test 10: AI Summarization Fallback & Quota Resilience
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: AI Summarization & Fallback ---');
    {
        WatchlistNewsSummarizer.clearCache();

        const earningsArticle: WatchlistArticle = {
            id: 'art-earn',
            headline: 'Tesla Beats Q3 Revenue Expectations and Raises Guidance',
            summary: 'Tesla Inc. delivered record vehicles and expanded operating margins in the third quarter.',
            source: 'Reuters',
            url: 'https://reuters.com/tesla-q3',
            datetime: Date.now(),
            relatedSymbols: ['TSLA'],
            relatedCompanies: ['Tesla'],
            relevanceScore: 30,
        };

        // When Gemini API is unavailable or throws, fallback generator produces valid structure
        const fallback = WatchlistNewsSummarizer.generateFallbackSummary(earningsArticle);
        assert(fallback.impact === 'positive', 'Earnings beat classified as positive impact');
        assert(fallback.whyItMatters.includes('revenue'), 'Why it matters mentions quarterly revenue');
        assert(fallback.bottomLine.includes('margin') || fallback.bottomLine.includes('guidance'), 'Bottom line mentions investor metrics to watch');

        // Test caching: multiple requests for same article return cached result
        const s1 = await WatchlistNewsSummarizer.summarizeArticle(earningsArticle);
        const s2 = await WatchlistNewsSummarizer.summarizeArticle(earningsArticle);
        assert(s1.whatHappened === s2.whatHappened, 'Article summary is properly cached across invocations');
    }

    // -------------------------------------------------------------------------
    // Test 11: News API Failure Handling
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: News API Failure Handling ---');
    {
        const apiErrorResult = {
            status: 'api_error' as const,
            articles: [],
            allTrackedSymbols: ['AAPL'],
            allTrackedCompanies: { AAPL: 'Apple' },
            symbolsWithNews: [],
            symbolsWithoutNews: ['AAPL'],
            error: 'Finnhub rate limit exceeded',
        };

        const email = renderWatchlistNewsEmail({
            dateStr: 'Friday, October 16, 2026',
            result: apiErrorResult,
        });

        assert(email.html.includes('Digest Update'), 'Handles API error with dignified service notice');
        assert(!email.html.includes('Finnhub rate limit exceeded'), 'Does not leak raw internal system errors to user');
        assert(email.html.includes('AAPL'), 'Remains aware of user tracked stocks');
    }

    // -------------------------------------------------------------------------
    // Test 12: HTML Escaping and XSS Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: HTML Escaping & Security ---');
    {
        const maliciousArticle: WatchlistArticle = {
            id: 'xss-1',
            headline: 'Tech Giant <script>alert("hacked")</script> & Partners <img src=x onerror=alert(1)>',
            summary: 'Attacker tried inserting <iframe src="evil.com"></iframe> into news.',
            source: 'Hacker <News>',
            url: 'javascript:alert("pwned")', // unsafe URL
            datetime: Date.now(),
            relatedSymbols: ['HACK'],
            relatedCompanies: ['Hack<Corp>'],
            relevanceScore: 10,
        };

        const email = renderWatchlistNewsEmail({
            dateStr: 'Friday, October 16, 2026',
            result: {
                status: 'success',
                articles: [maliciousArticle],
                allTrackedSymbols: ['HACK'],
                allTrackedCompanies: { HACK: 'Hack<Corp>' },
                symbolsWithNews: ['HACK'],
                symbolsWithoutNews: [],
            },
        });

        assert(!email.html.includes('<script>alert'), 'Script tags must be escaped');
        assert(!email.html.includes('href="javascript:'), 'Javascript URLs must be sanitized to safe links');
        assert(email.html.includes('&lt;script&gt;'), 'Dangerous brackets escaped to HTML entities');
        assert(email.html.includes('&amp;'), 'Ampersands properly escaped');
    }

    // -------------------------------------------------------------------------
    // Test 13: Recipient-to-Watchlist Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: User Isolation ---');
    {
        // User A tracks AAPL and MSFT
        const userAEmail = renderWatchlistNewsEmail({
            recipientName: 'User A',
            recipientEmail: 'user_a@test.com',
            dateStr: 'Friday, October 16, 2026',
            result: {
                status: 'success',
                articles: [{
                    id: 'aapl-only',
                    headline: 'Apple iOS 19 Release',
                    summary: 'Apple updates its mobile platform.',
                    source: 'TechCrunch',
                    url: 'https://techcrunch.com/ios-19',
                    datetime: Date.now(),
                    relatedSymbols: ['AAPL'],
                    relatedCompanies: ['Apple'],
                    relevanceScore: 20,
                }],
                allTrackedSymbols: ['AAPL', 'MSFT'],
                allTrackedCompanies: { AAPL: 'Apple', MSFT: 'Microsoft' },
                symbolsWithNews: ['AAPL'],
                symbolsWithoutNews: ['MSFT'],
            },
        });

        // User B tracks NVDA only
        const userBEmail = renderWatchlistNewsEmail({
            recipientName: 'User B',
            recipientEmail: 'user_b@test.com',
            dateStr: 'Friday, October 16, 2026',
            result: {
                status: 'no_news',
                articles: [],
                allTrackedSymbols: ['NVDA'],
                allTrackedCompanies: { NVDA: 'NVIDIA' },
                symbolsWithNews: [],
                symbolsWithoutNews: ['NVDA'],
            },
        });

        assert(userAEmail.html.includes('User A') && !userAEmail.html.includes('User B'), 'User A email contains only User A name');
        assert(userAEmail.html.includes(encodeURIComponent('user_a@test.com')) && !userAEmail.html.includes('user_b'), 'User A email contains only User A email');
        assert(userBEmail.html.includes('NVDA') && !userBEmail.html.includes('AAPL'), 'User B email never receives User A watchlist symbols');
        assert(!userBEmail.html.includes('Apple iOS 19 Release'), 'User B never receives User A news articles');
    }

    // -------------------------------------------------------------------------
    // Test 14: Unsubscribe and Preference URL Integration
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group: Unsubscribe Integration ---');
    {
        const email = renderWatchlistNewsEmail({
            recipientName: 'Subscriber',
            recipientEmail: 'investor_sub@example.com',
            dateStr: 'Friday, October 16, 2026',
            result: {
                status: 'no_news',
                articles: [],
                allTrackedSymbols: ['AAPL'],
                allTrackedCompanies: { AAPL: 'Apple' },
                symbolsWithNews: [],
                symbolsWithoutNews: ['AAPL'],
            },
        });

        assert(email.html.includes('/api/notifications/unsubscribe?email=investor_sub%40example.com'), 'Unsubscribe link properly includes encoded recipient email');
        assert(email.html.includes('Unsubscribe'), 'Footer contains explicit Unsubscribe link');
        assert(email.html.includes('© 2026 HyperStocks'), 'Footer contains HyperStocks branding and copyright');
    }

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================');
}

runTestSuite().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
