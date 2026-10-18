import { PersonalizationContextBuilder } from '../services/personalization/PersonalizationContext';
import { RecommendationEngine } from '../services/personalization/RecommendationEngine';
import { InsightRankingEngine, RawInsightItem } from '../services/personalization/InsightRanking';
import { OpportunityItem } from '../types/ai';

const mockCandidates: OpportunityItem[] = [
    {
        symbol: 'NVDA',
        company: 'NVIDIA Corporation',
        thesis: 'Unmatched AI compute expansion and high revenue growth',
        catalyst: 'Next-gen data center volume ramp',
        metricsHighlight: 'Gross Margin: 75% | Fwd P/E: 38x',
        confidence: 94,
        timeframe: 'Long Term',
        risk: 'Medium',
    },
    {
        symbol: 'JNJ',
        company: 'Johnson & Johnson',
        thesis: 'Defensive dividend income and recession-resilient medical cash flow',
        catalyst: 'Quarterly dividend boost and stable surgical utilization',
        metricsHighlight: 'Div Yield: 3.1% | Beta: 0.54',
        confidence: 90,
        timeframe: 'Long Term',
        risk: 'Low',
    },
    {
        symbol: 'PLTR',
        company: 'Palantir Technologies',
        thesis: 'High-beta momentum and AI enterprise software breakout',
        catalyst: 'US commercial revenue acceleration',
        metricsHighlight: 'Rev Growth: +54% | Beta: 2.1',
        confidence: 86,
        timeframe: 'Short Term',
        risk: 'High',
    },
];

const mockInsights: RawInsightItem[] = [
    {
        id: '1',
        category: 'risk',
        severity: 'critical',
        content: 'Federal Reserve rate volatility poses multiple contraction risk to high-beta equities',
        timeAgo: '10m ago',
    },
    {
        id: '2',
        category: 'technical',
        relatedSymbol: 'NVDA',
        sector: 'Technology',
        content: 'NVIDIA (NVDA) 14-day RSI and volume breakout above 50-day moving average',
        timeAgo: '15m ago',
    },
    {
        id: '3',
        category: 'fundamental',
        relatedSymbol: 'JNJ',
        sector: 'Healthcare',
        content: 'Johnson & Johnson (JNJ) operating cash flow safely covers annual dividend payouts',
        timeAgo: '30m ago',
    },
];

console.log('=== TEST 1: CONSERVATIVE INCOME INVESTOR ===');
const conservativeContext = PersonalizationContextBuilder.build({
    riskTolerance: 'conservative',
    investmentGoals: ['income', 'capital_preservation'],
    preferredSectors: ['Healthcare', 'Financials'],
    preferredAnalysisStyle: 'fundamental',
    favoriteStocks: ['JNJ'],
});

const engine = new RecommendationEngine();
const conservativeRecs = engine.recommend(mockCandidates, conservativeContext);
console.log('Top Recommended Stock:', conservativeRecs[0].symbol, 'Score:', conservativeRecs[0].matchScore, 'Factors:', conservativeRecs[0].matchingFactors);
if (conservativeRecs[0].symbol !== 'JNJ') throw new Error('Expected JNJ to top conservative recommendations');

const conservativeInsights = InsightRankingEngine.rankInsights(mockInsights, conservativeContext);
console.log('Conservative Top Insight:', conservativeInsights[0].relatedSymbol, conservativeInsights[0].category, 'Score:', conservativeInsights[0].score, 'Reasons:', conservativeInsights[0].relevanceReasons);
console.log('Conservative 2nd Insight:', conservativeInsights[1].category, 'Score:', conservativeInsights[1].score);

// Conservative user must rank JNJ Fundamental and Critical Risk ahead of NVDA Technical Momentum
const jnjRank = conservativeInsights.findIndex((i) => i.relatedSymbol === 'JNJ');
const nvdaRank = conservativeInsights.findIndex((i) => i.relatedSymbol === 'NVDA');
const riskRank = conservativeInsights.findIndex((i) => i.category === 'risk');
if (jnjRank > nvdaRank || riskRank > nvdaRank) {
    throw new Error('Conservative user should rank defensive JNJ and macro risk ahead of high-beta NVDA momentum');
}

console.log('\n=== TEST 2: AGGRESSIVE TECH MOMENTUM TRADER ===');
const aggressiveContext = PersonalizationContextBuilder.build({
    riskTolerance: 'aggressive',
    investmentGoals: ['growth', 'speculation'],
    preferredSectors: ['Technology'],
    preferredAnalysisStyle: 'technical',
    investmentHorizon: 'short_term',
    favoriteStocks: ['NVDA', 'PLTR'],
});

const aggressiveRecs = engine.recommend(mockCandidates, aggressiveContext);
console.log('Top Recommended Stock:', aggressiveRecs[0].symbol, 'Score:', aggressiveRecs[0].matchScore, 'Factors:', aggressiveRecs[0].matchingFactors);
if (aggressiveRecs[0].symbol !== 'NVDA') throw new Error('Expected NVDA to top aggressive tech recommendations');

const aggressiveInsights = InsightRankingEngine.rankInsights(mockInsights, aggressiveContext);
console.log('Top Ranked Insight Symbol/Category:', aggressiveInsights[0].relatedSymbol, aggressiveInsights[0].category, 'Score:', aggressiveInsights[0].score, 'Reasons:', aggressiveInsights[0].relevanceReasons);
if (aggressiveInsights[0].relatedSymbol !== 'NVDA') throw new Error('Expected NVDA technical insight to top aggressive ranking');

console.log('\n✅ ALL PERSONALIZATION ENGINE UNIT TESTS PASSED DETERMINISTICALLY!');
