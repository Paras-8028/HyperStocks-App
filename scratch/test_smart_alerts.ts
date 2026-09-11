import { calculatePriorityScore, sortAlertsByPriority } from '../services/alerts/AlertPriorityScorer';
import { SmartAlertGenerator } from '../services/alerts/SmartAlertGenerator';
import { SmartAlertItem, SmartAlertCategory } from '../types/alerts';
import { getAlertService } from '../services/alerts';

async function runTests() {
    console.log('=== STARTING SMART ALERTS TESTS ===\n');

    // 1. Priority Scoring Test
    console.log('Test 1: Priority Scoring');
    const p1 = calculatePriorityScore({
        category: 'portfolio_risk',
        severity: 'critical',
        timestamp: Date.now(),
        isRead: false,
        relatedSymbol: 'NVDA',
    }, { portfolioSymbols: ['NVDA'] });

    const p2 = calculatePriorityScore({
        category: 'news',
        severity: 'advisory',
        timestamp: Date.now() - 36 * 3600 * 1000,
        isRead: true,
        relatedSymbol: 'XYZ',
    }, { portfolioSymbols: ['NVDA'] });

    console.log(`- High Priority Portfolio Risk Score: ${p1}`);
    console.log(`- Low Priority Old News Score: ${p2}`);
    if (p1 <= p2) {
        throw new Error('Priority scoring failed: critical portfolio risk should outrank old read advisory news');
    }
    console.log('✓ Priority scoring verified.\n');

    // 2. Alert Generator Test
    console.log('Test 2: Smart Alert Generator across 8 categories');
    const sampleAlerts = SmartAlertGenerator.generateAlerts({
        userId: 'test-user',
        portfolioPositions: [
            {
                symbol: 'NVDA',
                shares: 50,
                costBasis: 120,
                currentPrice: 130,
            } as any,
        ],
        portfolioSummary: {
            totalValue: 10000,
            dailyGainLoss: 250,
            dailyGainLossPercent: 2.56,
        } as any,
        watchlistSymbols: ['AAPL', 'TSLA'],
        quotes: {
            AAPL: { symbol: 'AAPL', currentPrice: 230, previousClose: 220, change: 10, percentChange: 4.54 } as any,
            TSLA: { symbol: 'TSLA', currentPrice: 210, previousClose: 220, change: -10, percentChange: -4.54 } as any,
        },
    });

    console.log(`- Generated ${sampleAlerts.length} smart alerts.`);
    const categoriesFound = new Set(sampleAlerts.map(a => a.category));
    console.log('- Categories covered:', Array.from(categoriesFound));

    const requiredCategories: SmartAlertCategory[] = [
        'price',
        'percentage_movement',
        'volume',
        'technical_signal',
        'news',
        'earnings',
        'portfolio_risk',
        'ai_insight',
    ];

    for (const cat of requiredCategories) {
        if (!categoriesFound.has(cat)) {
            throw new Error(`Missing required category in generator: ${cat}`);
        }
    }

    // Verify causality "whyItMatters" presence
    sampleAlerts.forEach((a) => {
        if (!a.whyItMatters || a.whyItMatters.trim().length < 10) {
            throw new Error(`Alert "${a.title}" is missing "whyItMatters" causality explanation.`);
        }
    });
    console.log('✓ All 8 categories present with rich causality explanations.\n');

    // 3. Sorting test
    console.log('Test 3: Sorting alerts by priority');
    const sorted = sortAlertsByPriority(sampleAlerts);
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].priorityScore < sorted[i + 1].priorityScore) {
            throw new Error('Alerts not sorted descending by priority score');
        }
    }
    console.log(`✓ Alerts sorted correctly. Top alert: "${sorted[0].title}" (Score: ${sorted[0].priorityScore})`);

    // 4. Alert Service In-Memory Preferences & Reads Test
    console.log('\nTest 4: AlertService Preferences');
    const alertService = getAlertService();
    const prefsRes = await alertService.getUserAlertPreferences('test-user');
    if (!prefsRes.success || !prefsRes.data) {
        throw new Error('Failed to get user preferences');
    }
    console.log('- Default preferences retrieved successfully.');

    const updateRes = await alertService.updateAlertPreferences('test-user', {
        minSeverity: 'warning',
    });
    if (!updateRes.success || updateRes.data?.minSeverity !== 'warning') {
        throw new Error('Failed to update alert preferences');
    }
    console.log('✓ Alert preferences updated successfully.');

    // Test mark read
    const markRes = await alertService.markAlertRead('test-user', sampleAlerts[0].id);
    if (!markRes.success) {
        throw new Error('Failed to mark alert as read');
    }
    console.log('✓ Mark alert read verified.');

    console.log('\n=== ALL SMART ALERT TESTS PASSED! ===');
}

runTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
