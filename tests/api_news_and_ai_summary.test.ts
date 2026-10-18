import assert from 'assert';
import { FinnhubNewsService } from '@/services/news/FinnhubNewsService';
import { WatchlistNewsService, WatchlistArticle } from '@/services/news/WatchlistNewsService';
import { WatchlistNewsSummarizer } from '@/services/news/WatchlistNewsSummarizer';
import { NewsAnalyzerService } from '@/services/news/NewsAnalyzerService';
import { NewsClusteringService } from '@/services/news/NewsClusteringService';

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
    console.log('🧪 HyperStocks — AI News Intelligence & Sentiment Test Suite');
    console.log('============================================================\n');

    // =========================================================================
    // SUITE 1: SENTIMENT CLASSIFICATION (Bullish, Bearish, Neutral, Mixed)
    // =========================================================================
    console.log('--- Suite 1: Sentiment Analysis & Confidence Calibration ---');

    await runTest('Classifies clear positive catalyst as Bullish with high confidence (>= 0.80)', () => {
        const bullishArticle: WatchlistArticle = {
            id: 'bull_1',
            headline: 'NVIDIA Beats Quarterly Earnings Estimates With Record Revenue Growth',
            summary: 'NVIDIA reported quarterly revenue surging 94% year-over-year, surpassing Wall Street expectations.',
            source: 'Reuters',
            url: 'https://reuters.com/nvda-earnings',
            datetime: Date.now(),
            relatedSymbols: ['NVDA'],
            relatedCompanies: ['NVIDIA'],
            relevanceScore: 25,
        };

        const result = WatchlistNewsSummarizer.generateFallbackSummary(bullishArticle);

        assert.strictEqual(result.sentiment, 'bullish');
        assert.strictEqual(result.companySentiment, 'bullish');
        assert.ok(result.confidenceScore >= 0.80 && result.confidenceScore <= 1.0, 'Confidence score must be in [0.80, 1.0]');
        assert.ok(result.confidenceRationale.length > 10, 'Must provide clear confidence rationale');
        assert.strictEqual(result.impact, 'positive');
    });

    await runTest('Classifies regulatory probe / earnings miss as Bearish with high confidence (>= 0.80)', () => {
        const bearishArticle: WatchlistArticle = {
            id: 'bear_1',
            headline: 'Federal Trade Commission Launches Antitrust Lawsuit and Probe Into Tech Practices',
            summary: 'Regulators opened formal investigation and subpoena proceedings alleging anti-competitive practices.',
            source: 'WSJ',
            url: 'https://wsj.com/ftc-antitrust',
            datetime: Date.now(),
            relatedSymbols: ['MSFT'],
            relatedCompanies: ['Microsoft'],
            relevanceScore: 25,
        };

        const result = WatchlistNewsSummarizer.generateFallbackSummary(bearishArticle);

        assert.strictEqual(result.sentiment, 'bearish');
        assert.strictEqual(result.companySentiment, 'bearish');
        assert.ok(result.confidenceScore >= 0.80 && result.confidenceScore <= 1.0, 'Confidence score must be in [0.80, 1.0]');
        assert.strictEqual(result.impact, 'negative');
    });

    await runTest('Classifies contradictory reports as Mixed sentiment without speculative extrapolation', () => {
        const mixedArticle: WatchlistArticle = {
            id: 'mixed_1',
            headline: 'Tesla Beats Quarterly Delivery Estimates But Slashes Forward Price Guidance Amid DOJ Probe',
            summary: 'Tesla topped vehicle delivery numbers but lowered guidance and reported ongoing regulatory subpoena inquiry.',
            source: 'Bloomberg',
            url: 'https://bloomberg.com/tsla-mixed',
            datetime: Date.now(),
            relatedSymbols: ['TSLA'],
            relatedCompanies: ['Tesla'],
            relevanceScore: 25,
        };

        const result = WatchlistNewsSummarizer.generateFallbackSummary(mixedArticle);

        assert.strictEqual(result.sentiment, 'mixed');
        assert.strictEqual(result.companySentiment, 'mixed');
        assert.strictEqual(result.impact, 'mixed');
        assert.ok(result.confidenceScore >= 0.60 && result.confidenceScore <= 0.85);
        assert.ok(result.risks.length > 0, 'Must identify risks supported by the article');
        assert.ok(result.opportunities.length > 0, 'Must identify opportunities supported by the article');
    });

    await runTest('Classifies routine corporate schedule / sparse text as Neutral with lower baseline confidence', () => {
        const neutralArticle: WatchlistArticle = {
            id: 'neut_1',
            headline: 'Apple to Host Annual Shareholder Meeting on February 28',
            summary: 'Apple Inc announced the date and virtual participation details for its annual meeting of shareholders.',
            source: 'Business Wire',
            url: 'https://businesswire.com/apple-meeting',
            datetime: Date.now(),
            relatedSymbols: ['AAPL'],
            relatedCompanies: ['Apple'],
            relevanceScore: 10,
        };

        const result = WatchlistNewsSummarizer.generateFallbackSummary(neutralArticle);

        assert.strictEqual(result.sentiment, 'neutral');
        assert.strictEqual(result.companySentiment, 'neutral');
        assert.ok(result.confidenceScore >= 0.50 && result.confidenceScore <= 0.70);
        assert.strictEqual(result.impact, 'uncertain');
    });

    await runTest('Distinguishes company-specific sentiment from overall market / macro sentiment', () => {
        const macroArticle: WatchlistArticle = {
            id: 'macro_1',
            headline: 'Broadcom Surges on Record Chip Shipments Despite Federal Reserve Rate Hike Concerns',
            summary: 'Broadcom posted strong semiconductor results even as Fed interest rate warnings weigh on overall market sentiment.',
            source: 'MarketWatch',
            url: 'https://marketwatch.com/avgo-chips',
            datetime: Date.now(),
            relatedSymbols: ['AVGO'],
            relatedCompanies: ['Broadcom'],
            relevanceScore: 22,
        };

        const result = WatchlistNewsSummarizer.generateFallbackSummary(macroArticle);

        // Company is bullish (chip surge), but macro context is recognized as bearish
        assert.strictEqual(result.companySentiment, 'bullish');
        assert.strictEqual(result.marketSentiment, 'bearish');
    });

    // =========================================================================
    // SUITE 2: IMPACT ANALYSIS & EVIDENCE PRESERVATION
    // =========================================================================
    console.log('\n--- Suite 2: Impact Analysis & Factual Evidence Preservation ---');

    await runTest('Separates short-term implications from longer-term structural considerations', () => {
        const article: WatchlistArticle = {
            id: 'art_outlook',
            headline: 'Eli Lilly Secures FDA Approval for Next-Generation Treatment',
            summary: 'FDA granted marketing clearance for Eli Lilly expanding its commercial pharmaceutical reach.',
            source: 'BioPharma Dive',
            url: 'https://biopharmadive.com/eli-lilly-fda',
            datetime: Date.now(),
            relatedSymbols: ['LLY'],
            relatedCompanies: ['Eli Lilly'],
            relevanceScore: 28,
        };

        const result = WatchlistNewsSummarizer.generateFallbackSummary(article);

        assert.ok(result.shortTermOutlook && result.shortTermOutlook.length > 15, 'Must provide short-term outlook');
        assert.ok(result.longTermConsiderations && result.longTermConsiderations.length > 15, 'Must provide long-term considerations');
        assert.notStrictEqual(result.shortTermOutlook, result.longTermConsiderations, 'Short and long term must be distinct');
        assert.ok(result.opportunities.length > 0, 'Must extract verified opportunities');
    });

    await runTest('Does not fabricate price targets, returns, or future probabilities', () => {
        const article: WatchlistArticle = {
            id: 'art_clean',
            headline: 'Amazon Reports Accelerating AWS Cloud Infrastructure Demand',
            summary: 'Amazon Web Services expanded customer commitments across enterprise AI software.',
            source: 'TechCrunch',
            url: 'https://techcrunch.com/amazon-aws',
            datetime: Date.now(),
            relatedSymbols: ['AMZN'],
            relatedCompanies: ['Amazon'],
            relevanceScore: 20,
        };

        const result = WatchlistNewsSummarizer.generateFallbackSummary(article);

        const allText = `${result.whatHappened} ${result.whyItMatters} ${result.shortTermOutlook} ${result.longTermConsiderations} ${result.risks.join(' ')} ${result.opportunities.join(' ')}`;

        // Verify absence of fabricated numerical claims
        assert.ok(!/\b\d+%\s+probability\b/i.test(allText), 'Must not fabricate probability forecasts');
        assert.ok(!/\bprice\s+target\s+of\s+\$\d+/i.test(allText), 'Must not fabricate price targets');
        assert.ok(!/\bguaranteed\s+return\b/i.test(allText), 'Must not promise guaranteed returns');
    });

    await runTest('Preserves original URL, publisher, headline, and timestamp intact', async () => {
        const article: WatchlistArticle = {
            id: 'art_source_test',
            headline: 'Apple Beats Quarterly Revenue Estimates on Resilient Services Growth',
            summary: 'Apple reported quarterly revenue of $94.9 billion, topping Wall Street expectations.',
            source: 'Reuters',
            url: 'https://reuters.com/apple-q4-verified',
            datetime: 1729000000000,
            relatedSymbols: ['AAPL'],
            relatedCompanies: ['Apple'],
            relevanceScore: 30,
        };

        const summarized = await WatchlistNewsSummarizer.summarizeArticle(article);

        assert.strictEqual(summarized.sourceEvidence?.url, 'https://reuters.com/apple-q4-verified');
        assert.strictEqual(summarized.sourceEvidence?.source, 'Reuters');
        assert.strictEqual(summarized.sourceEvidence?.headline, 'Apple Beats Quarterly Revenue Estimates on Resilient Services Growth');
        assert.strictEqual(summarized.sourceEvidence?.datetime, 1729000000000);
        assert.strictEqual(summarized.impact, 'positive');
    });

    await runTest('Returns safe neutral fallback when source material is insufficient or clickbait', () => {
        const emptyArticle: WatchlistArticle = {
            id: 'sparse_empty',
            headline: 'Stock update', // too short (< 15 chars)
            summary: '',
            source: 'Spam Wire',
            url: '#',
            datetime: Date.now(),
            relatedSymbols: ['XYZ'],
            relatedCompanies: ['XYZ Corp'],
            relevanceScore: 5,
        };

        const result = WatchlistNewsSummarizer.generateFallbackSummary(emptyArticle);

        assert.strictEqual(result.sentiment, 'neutral');
        assert.strictEqual(result.isFallback, true);
        assert.ok(result.confidenceScore <= 0.40, 'Low confidence score for sparse material');
        assert.ok(result.whyItMatters.includes('insufficient') || result.whyItMatters.includes('Source material'));
        assert.strictEqual(result.risks.length, 0);
        assert.strictEqual(result.opportunities.length, 0);
    });

    // =========================================================================
    // SUITE 3: NEWS AGGREGATION & CROSS-TICKER DEDUPLICATION
    // =========================================================================
    console.log('\n--- Suite 3: Deduplication & Provider Failure Handling ---');

    await runTest('Deduplicates syndicated wire copies repeating the same headline with prefixes', () => {
        const service = new WatchlistNewsService('dummy_token');

        const article1 = {
            id: 'art_reuters',
            headline: 'Apple and Microsoft Partner on Next-Gen Enterprise Security Cloud',
            summary: 'Companies team up for multi-cloud enterprise threat detection.',
            source: 'Reuters',
            url: 'https://reuters.com/apple-msft',
            datetime: Math.floor(Date.now() / 1000),
        };

        // Wire repeating the same announcement with "BRIEF -" prefix and different URL
        const article2 = {
            id: 'art_syndicated',
            headline: 'BRIEF - Apple and Microsoft partner on next-gen enterprise security cloud',
            summary: 'Companies announce enterprise agreement.',
            source: 'MarketWatch',
            url: 'https://marketwatch.com/syndicated-copy',
            datetime: Math.floor(Date.now() / 1000),
        };

        const mockNewsMap = new Map<string, any[]>([
            ['AAPL', [article1]],
            ['MSFT', [article2]],
        ]);

        const watchlist = [
            { symbol: 'AAPL', company: 'Apple Inc.' },
            { symbol: 'MSFT', company: 'Microsoft Corporation' },
        ];

        const result = service.filterAndRankNewsForWatchlist(watchlist, mockNewsMap);

        assert.strictEqual(result.status, 'success');
        // Must coalesce the duplicate wire announcement into 1 evidence item
        assert.strictEqual(result.articles.length, 1);
        assert.ok(result.articles[0].relatedSymbols.includes('AAPL'));
        assert.ok(result.articles[0].relatedSymbols.includes('MSFT'));
    });

    await runTest('FinnhubNewsService gracefully handles missing API key without unhandled exceptions', async () => {
        const noKeyService = new FinnhubNewsService('');
        const res = await noKeyService.getMarketNews('general');

        assert.strictEqual(res.success, false);
        assert.strictEqual(res.code, 'MISSING_API_KEY');
    });

    await runTest('NewsClusteringService identifies mixed cluster when articles have opposing sentiment', () => {
        const articles = [
            NewsAnalyzerService.analyzeArticle({
                id: 'c1',
                headline: 'Apple Beats Profit Expectations With Record Services Surge',
                summary: 'Quarterly net income reached record levels.',
                source: 'Wire A',
                url: '#',
                datetime: Date.now(),
                relatedSymbol: 'AAPL',
            }),
            NewsAnalyzerService.analyzeArticle({
                id: 'c2',
                headline: 'Apple Faces Severe Antitrust Fine and Lawsuit in Europe Over App Store',
                summary: 'Regulators levied penalties and opened formal investigations.',
                source: 'Wire B',
                url: '#',
                datetime: Date.now() - 3600000,
                relatedSymbol: 'AAPL',
            }),
        ];

        const clusters = NewsClusteringService.clusterArticles(articles);
        assert.ok(clusters.length >= 1);
        const appleCluster = clusters.find((c) => c.affectedStocks.some((s) => s.symbol === 'AAPL'));
        assert.ok(appleCluster);
        assert.strictEqual(appleCluster.dominantSentiment, 'mixed');
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
