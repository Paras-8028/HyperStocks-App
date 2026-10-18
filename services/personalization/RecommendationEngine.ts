import {
    PersonalizationContext,
    ScoredOpportunity,
} from '@/types/personalization';
import { OpportunityItem } from '@/types/ai';

export interface IRecommendationStrategy {
    name: string;
    generateRecommendations(
        candidates: OpportunityItem[],
        context: PersonalizationContext,
        limit?: number
    ): ScoredOpportunity[];
}

export class RuleBasedRecommendationStrategy implements IRecommendationStrategy {
    readonly name = 'RuleBasedMultiFactor';

    generateRecommendations(
        candidates: OpportunityItem[],
        context: PersonalizationContext,
        limit = 6
    ): ScoredOpportunity[] {
        const prefs = context.profile.preferences;
        const userGoals = Array.isArray(prefs.investmentGoals)
            ? prefs.investmentGoals.map((g) => g.toLowerCase())
            : [String(prefs.investmentGoals).toLowerCase()];
        const riskTol = (prefs.riskTolerance || 'moderate').toLowerCase();

        const scored = candidates.map((cand) => {
            let score = 50;
            const matchingFactors: string[] = [];

            // 1. Sector Affinity
            const candSector = (cand as any).sector || this.inferSector(cand.symbol);
            const matchesSector = (prefs.preferredSectors || []).some(
                (s) => s.toLowerCase() === candSector.toLowerCase()
            );

            if (matchesSector) {
                score += 30;
                matchingFactors.push(`Sector focus: ${candSector}`);
            }

            // 2. Risk Tolerance Alignment
            const candRisk = (cand.risk || 'Medium').toLowerCase();
            if (riskTol === 'conservative' || riskTol === 'low') {
                if (candRisk === 'low') {
                    score += 35;
                    matchingFactors.push('Matches conservative capital preservation profile');
                } else if (candRisk === 'high') {
                    score -= 30;
                }
            } else if (riskTol === 'aggressive' || riskTol === 'high') {
                if (candRisk === 'high' || candRisk === 'medium') {
                    score += 25;
                    matchingFactors.push('High upside potential for aggressive risk appetite');
                }
            } else {
                // Moderate
                if (candRisk === 'medium' || candRisk === 'low') {
                    score += 20;
                    matchingFactors.push('Balanced risk-to-reward ratio');
                }
            }

            // 3. Investment Goal Alignment
            const candThesis = cand.thesis.toLowerCase();
            if (userGoals.includes('growth') || userGoals.includes('speculation')) {
                if (candThesis.includes('growth') || candThesis.includes('expansion') || candThesis.includes('ai')) {
                    score += 20;
                    matchingFactors.push('Top-line growth & market expansion catalysts');
                }
            }
            if (userGoals.includes('income')) {
                if (candThesis.includes('dividend') || candThesis.includes('cash flow') || candThesis.includes('repurchase')) {
                    score += 25;
                    matchingFactors.push('Strong cash return & yield generation');
                }
            }
            if (userGoals.includes('capital_preservation') || userGoals.includes('conservative')) {
                if (candThesis.includes('margin') || candThesis.includes('defensive') || candRisk === 'low') {
                    score += 25;
                    matchingFactors.push('Defensive quality balance sheet');
                }
            }

            // 4. Investment Horizon Alignment
            const userHorizon = prefs.investmentHorizon || 'medium_term';
            const candTimeframe = cand.timeframe?.toLowerCase() || 'medium term';

            if (userHorizon === 'short_term' && candTimeframe.includes('short')) {
                score += 15;
                matchingFactors.push('Tactical short-term catalyst window');
            } else if (userHorizon === 'long_term' && candTimeframe.includes('long')) {
                score += 15;
                matchingFactors.push('Multi-year structural secular tailwind');
            } else if (userHorizon === 'medium_term' && candTimeframe.includes('medium')) {
                score += 10;
                matchingFactors.push('Intermediate-term thesis execution');
            }

            // 5. Watchlist / Favorite Affinity
            const inWatchlist = context.profile.watchlistSymbols.some(
                (s) => s.toUpperCase() === cand.symbol.toUpperCase()
            );
            if (inWatchlist) {
                score += 10;
                matchingFactors.push(`Already on your radar (${cand.symbol})`);
            }

            // 6. Model Conviction Base
            score += Math.round(((cand.confidence || 80) - 70) * 0.5);

            if (matchingFactors.length === 0) {
                matchingFactors.push('Attractive multi-factor valuation');
            }

            return {
                symbol: cand.symbol,
                company: cand.company,
                sector: candSector,
                thesis: cand.thesis,
                catalyst: cand.catalyst,
                metricsHighlight: cand.metricsHighlight,
                matchScore: Math.min(100, Math.max(10, score)),
                confidence: cand.confidence,
                timeframe: cand.timeframe,
                risk: cand.risk,
                matchingFactors,
            };
        });

        return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
    }

    private inferSector(symbol: string): string {
        const sectorMap: Record<string, string> = {
            AAPL: 'Technology',
            NVDA: 'Technology',
            MSFT: 'Technology',
            AMD: 'Technology',
            GOOGL: 'Communication Services',
            META: 'Communication Services',
            AMZN: 'Consumer Discretionary',
            TSLA: 'Consumer Discretionary',
            UBER: 'Consumer Discretionary',
            LLY: 'Healthcare',
            JNJ: 'Healthcare',
            UNH: 'Healthcare',
            JPM: 'Financials',
            BAC: 'Financials',
            V: 'Financials',
            XOM: 'Energy',
            CVX: 'Energy',
            CAT: 'Industrials',
            SPY: 'Broad Market',
            QQQ: 'Technology',
        };
        return sectorMap[symbol.toUpperCase()] || 'Diversified';
    }
}

export class RecommendationEngine {
    private strategy: IRecommendationStrategy;

    constructor(strategy?: IRecommendationStrategy) {
        this.strategy = strategy || new RuleBasedRecommendationStrategy();
    }

    /**
     * Swap strategy at runtime (e.g. for A/B testing or future ML-based models)
     */
    public setStrategy(strategy: IRecommendationStrategy): void {
        this.strategy = strategy;
    }

    public recommend(
        candidates: OpportunityItem[],
        context: PersonalizationContext,
        limit = 6
    ): ScoredOpportunity[] {
        return this.strategy.generateRecommendations(candidates, context, limit);
    }
}
