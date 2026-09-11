import { PortfolioAnalyticsService } from '../services/portfolio/PortfolioAnalyticsService';
import { PortfolioPosition } from '../types/portfolio';

const mockHoldings: PortfolioPosition[] = [
    {
        id: '1',
        userId: 'test',
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        shares: 50,
        costBasis: 150.00,
        currentPrice: 240.00,
        dailyChange: 2.50,
        sector: 'Technology',
        beta: 1.08,
    },
    {
        id: '2',
        userId: 'test',
        symbol: 'NVDA',
        companyName: 'NVIDIA Corporation',
        shares: 30,
        costBasis: 100.00,
        currentPrice: 130.00,
        dailyChange: -1.20,
        sector: 'Technology',
        beta: 1.68,
    },
    {
        id: '3',
        userId: 'test',
        symbol: 'JNJ',
        companyName: 'Johnson & Johnson',
        shares: 20,
        costBasis: 160.00,
        currentPrice: 150.00,
        dailyChange: 0.80,
        sector: 'Healthcare',
        beta: 0.54,
    },
];

console.log('=== TEST 1: DETERMINISTIC PORTFOLIO ANALYTICS ===');
const analysis = PortfolioAnalyticsService.analyze(mockHoldings);

// AAPL: 50 * 240 = 12,000
// NVDA: 30 * 130 = 3,900
// JNJ:  20 * 150 = 3,000
// Total Value = 18,900
console.log('Total Portfolio Value:', analysis.summary.totalValue);
if (analysis.summary.totalValue !== 18900) {
    throw new Error(`Expected total value 18900, got ${analysis.summary.totalValue}`);
}

// Total Cost = (50*150) + (30*100) + (20*160) = 7500 + 3000 + 3200 = 13,700
console.log('Total Cost Basis:', analysis.summary.totalCost);
if (analysis.summary.totalCost !== 13700) {
    throw new Error(`Expected total cost 13700, got ${analysis.summary.totalCost}`);
}

// Unrealized P&L = 18,900 - 13,700 = +5,200 (+37.96%)
console.log('Unrealized P&L:', analysis.summary.totalUnrealizedGainLoss, `(${analysis.summary.totalGainLossPercent.toFixed(2)}%)`);
if (analysis.summary.totalUnrealizedGainLoss !== 5200) {
    throw new Error(`Expected P&L 5200, got ${analysis.summary.totalUnrealizedGainLoss}`);
}

// Daily P&L = (50*2.50) + (30*-1.20) + (20*0.80) = 125 - 36 + 16 = +105
console.log('Daily Gain/Loss:', analysis.summary.dailyGainLoss);
if (analysis.summary.dailyGainLoss !== 105) {
    throw new Error(`Expected daily gain 105, got ${analysis.summary.dailyGainLoss}`);
}

// Concentration check: AAPL weight = 12,000 / 18,900 = ~63.49%
console.log('Top Stock Concentration:', analysis.concentration.topStock.symbol, `${analysis.concentration.topStock.percent.toFixed(2)}%`);
if (analysis.concentration.topStock.symbol !== 'AAPL' || analysis.concentration.topStock.percent < 60) {
    throw new Error('Expected AAPL to exceed 60% concentration');
}
if (!analysis.concentration.isConcentrated) {
    throw new Error('Expected portfolio to be flagged as concentrated');
}

// Sector allocation check: Tech = 15,900 / 18,900 = ~84.13%
const techSector = analysis.sectorExposures.find(s => s.sector === 'Technology');
console.log('Technology Sector Weight:', techSector?.percent.toFixed(2) + '%');
if (!techSector || techSector.percent < 80) {
    throw new Error('Expected Technology sector to exceed 80%');
}

// Attribution check: Top contributor must be AAPL (+4,500), Bottom detractor must be JNJ (-200)
console.log('Top Contributor:', analysis.attribution.topContributors[0]?.symbol, '+$' + analysis.attribution.topContributors[0]?.dollarContribution);
console.log('Bottom Detractor:', analysis.attribution.bottomDetractors[0]?.symbol, '-$' + Math.abs(analysis.attribution.bottomDetractors[0]?.dollarContribution || 0));
if (analysis.attribution.topContributors[0]?.symbol !== 'AAPL') {
    throw new Error('Expected AAPL to be top contributor');
}
if (analysis.attribution.bottomDetractors[0]?.symbol !== 'JNJ') {
    throw new Error('Expected JNJ to be bottom detractor');
}

// Deterministic alerts check
console.log('Generated Alerts Count:', analysis.alerts.length);
analysis.alerts.forEach(a => console.log(` - [${a.type.toUpperCase()} / ${a.severity}] ${a.title}`));
const hasConcAlert = analysis.alerts.some(a => a.type === 'concentration');
if (!hasConcAlert) {
    throw new Error('Expected concentration alert to be generated');
}

console.log('\n✅ ALL DETERMINISTIC PORTFOLIO ANALYTICS TESTS PASSED WITH 100% MATHEMATICAL PRECISION!');
