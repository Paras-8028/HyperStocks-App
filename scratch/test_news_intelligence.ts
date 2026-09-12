import { NewsAnalyzerService } from '../services/news/NewsAnalyzerService';
import { NewsClusteringService } from '../services/news/NewsClusteringService';
import { NewsIntelligenceService } from '../services/news/NewsIntelligenceService';
import { RawNewsArticle } from '../types/news';

async function runTests() {
    console.log('=== STARTING NEWS INTELLIGENCE TESTS ===\n');

    // 1. Raw Articles Mock
    const mockArticles: RawNewsArticle[] = [
        {
            id: 101,
            headline: 'Nvidia Surges to Record High Following Massive AI Enterprise Demand',
            summary: 'Nvidia shares rallied 6.5% today as cloud providers announced billions in hardware infrastructure commitments.',
            source: 'Bloomberg Financial',
            url: 'https://bloomberg.com/news/101',
            datetime: Date.now() - 3600 * 1000,
            relatedSymbol: 'NVDA',
        },
        {
            id: 102,
            headline: 'Tech Sector Momentum Continues as Nvidia Blackwell Chip Production Ramps Up',
            summary: 'Semiconductor manufacturers are seeing strong institutional inflows following positive comments from Nvidia management.',
            source: 'Reuters',
            url: 'https://reuters.com/news/102',
            datetime: Date.now() - 2 * 3600 * 1000,
        },
        {
            id: 103,
            headline: 'Tesla Slumps on Delivery Shortfall and Growing Margin Compression',
            summary: 'Tesla shares dropped 4.2% after quarterly vehicle deliveries missed analyst estimates amid price cuts.',
            source: 'Wall Street Journal',
            url: 'https://wsj.com/news/103',
            datetime: Date.now() - 5 * 3600 * 1000,
            relatedSymbol: 'TSLA',
        },
        {
            id: 104,
            headline: 'Federal Reserve Holds Interest Rates Steady, Citing Balanced Inflation Data',
            summary: 'Chairman Jerome Powell signaled that central bank policymakers will remain patient before initiating further policy adjustments.',
            source: 'Financial Times',
            url: 'https://ft.com/news/104',
            datetime: Date.now() - 8 * 3600 * 1000,
        },
    ];

    // TEST 1: NewsAnalyzerService
    console.log('Test 1: News Analyzer (Sentiment, Stock Impact, Sector Impact)');
    const analyzed = mockArticles.map((a) => NewsAnalyzerService.analyzeArticle(a));

    // Check Article 1 (Nvidia surge)
    const art1 = analyzed[0];
    console.log(`- Article 1 Sentiment: ${art1.sentiment.label} (Score: ${art1.sentiment.score})`);
    if (art1.sentiment.label !== 'positive') {
        throw new Error(`Expected positive sentiment for Nvidia surge, got ${art1.sentiment.label}`);
    }

    const nvdaStock = art1.affectedStocks.find((s) => s.symbol === 'NVDA');
    if (!nvdaStock) {
        throw new Error('Failed to detect NVDA stock impact in Article 1');
    }
    console.log(`- Detected Stock Impact: ${nvdaStock.symbol} (${nvdaStock.direction}, magnitude: ${nvdaStock.magnitude})`);

    const techSector = art1.affectedSectors.find((s) => s.sector === 'Technology');
    if (!techSector) {
        throw new Error('Failed to detect Technology sector impact in Article 1');
    }
    console.log(`- Detected Sector Impact: ${techSector.sector} (Weight: ${techSector.weight})`);

    // Check Article 3 (Tesla slump)
    const art3 = analyzed[2];
    console.log(`- Article 3 Sentiment: ${art3.sentiment.label} (Score: ${art3.sentiment.score})`);
    if (art3.sentiment.label !== 'negative') {
        throw new Error(`Expected negative sentiment for Tesla slump, got ${art3.sentiment.label}`);
    }
    console.log('✓ News Analyzer passed.\n');

    // TEST 2: NewsClusteringService
    console.log('Test 2: News Clustering & Market Event Timeline');
    const clusters = NewsClusteringService.clusterArticles(analyzed);
    console.log(`- Clustered ${analyzed.length} articles into ${clusters.length} distinct story clusters.`);

    // Articles 101 and 102 should be clustered together under Nvidia/Semis
    const nvdaCluster = clusters.find((c) => c.affectedStocks.some((s) => s.symbol === 'NVDA'));
    if (!nvdaCluster) {
        throw new Error('Failed to find NVDA cluster');
    }
    console.log(`- NVDA Cluster "${nvdaCluster.topic}" contains ${nvdaCluster.articles.length} articles.`);
    if (nvdaCluster.articles.length < 2) {
        throw new Error(`Expected at least 2 articles in NVDA cluster, got ${nvdaCluster.articles.length}`);
    }

    // Build timeline
    const timeline = NewsClusteringService.buildMarketTimeline(clusters);
    console.log(`- Timeline generated with ${timeline.length} chronological events.`);
    if (timeline.length === 0) {
        throw new Error('Timeline generation produced 0 events');
    }
    console.log(`- First Timeline Event: "${timeline[0].title}" (${timeline[0].sentiment})`);
    console.log('✓ News Clustering & Timeline passed.\n');

    // TEST 3: Personalized News Ranking & Explanations
    console.log('Test 3: Personalized Ranking and Causality Explanations');
    const fakeNewsService = {
        getMarketNews: async () => ({ success: true, data: mockArticles }),
        getCuratedWatchlistNews: async () => ({ success: true, data: mockArticles }),
    } as any;

    const intelligenceService = new NewsIntelligenceService(fakeNewsService);
    const result = await intelligenceService.getNewsIntelligence({
        portfolioSymbols: ['NVDA'],
        watchlistSymbols: ['TSLA'],
        preferredSectors: ['Technology'],
    });

    if (!result.success || !result.data) {
        const errMsg = !result.success ? result.error : 'Unknown error';
        throw new Error(`News intelligence failed: ${errMsg}`);
    }

    const { personalizedFeed, marketSummary } = result.data;
    console.log(`- Personalized feed contains ${personalizedFeed.length} ranked items.`);

    // NVDA should be ranked #1 because user holds it in their portfolio
    const topItem = personalizedFeed[0];
    console.log(`- Top Ranked Story: "${topItem.cluster.primaryHeadline}"`);
    console.log(`- Relevance Score: ${topItem.relevanceScore}/100`);
    console.log(`- Personalized Causality: "${topItem.personalExplanation}"`);

    if (!topItem.cluster.affectedStocks.some((s) => s.symbol === 'NVDA')) {
        throw new Error('Expected portfolio holding NVDA to rank #1 in personalized news feed');
    }

    if (!topItem.personalExplanation || topItem.personalExplanation.length < 20) {
        throw new Error('Personalized causality explanation is missing or too short');
    }

    // Check Market Summary
    console.log(`\n- AI Market Summary Headline: "${marketSummary.headline}"`);
    console.log(`- Market Narrative: "${marketSummary.marketNarrative}"`);
    console.log(`- Key Catalysts: ${marketSummary.keyCatalysts.length}`);
    console.log(`- Risks: ${marketSummary.topRisks.length}`);
    console.log(`- Opportunities: ${marketSummary.topOpportunities.length}`);

    if (!marketSummary.headline || marketSummary.keyCatalysts.length === 0) {
        throw new Error('Market summary is incomplete');
    }

    console.log('\n=== ALL NEWS INTELLIGENCE TESTS PASSED! ===');
}

runTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
