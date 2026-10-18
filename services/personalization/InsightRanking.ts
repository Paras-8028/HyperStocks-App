import {
    PersonalizationContext,
    ScoredInsight,
} from '@/types/personalization';
import { PersonalizationContextBuilder } from './PersonalizationContext';

export interface RawInsightItem {
    id: string;
    title?: string;
    content: string;
    category: 'macro' | 'technical' | 'fundamental' | 'sentiment' | 'risk' | 'volume';
    relatedSymbol?: string;
    sector?: string;
    severity?: 'info' | 'advisory' | 'warning' | 'critical';
    timeAgo?: string;
    timestamp?: number;
}

export class InsightRankingEngine {
    /**
     * Scores and ranks a collection of market insights against the user's personalization context.
     * Produces explainable relevance reasons for each score.
     */
    public static rankInsights(
        items: RawInsightItem[],
        context: PersonalizationContext
    ): ScoredInsight[] {
        const prefs = context.profile.preferences;
        const analysisBias = PersonalizationContextBuilder.getAnalysisBias(context);
        const riskMultiplier = PersonalizationContextBuilder.getRiskMultiplier(context);

        const scored = items.map((item) => {
            let score = 50; // baseline score
            const relevanceReasons: string[] = [];

            // 1. Direct Symbol Relevance (Holdings, Watchlist, Favorites)
            if (item.relatedSymbol) {
                const sym = item.relatedSymbol.toUpperCase();
                const isHolding = context.profile.holdings.some((h) => h.symbol.toUpperCase() === sym);
                const isWatchlist = context.profile.watchlistSymbols.some((s) => s.toUpperCase() === sym);
                const isFavorite = (prefs.favoriteStocks || []).some((s) => s.toUpperCase() === sym);

                if (isHolding) {
                    score += 45;
                    relevanceReasons.push(`Direct portfolio holding (${sym})`);
                } else if (isWatchlist || isFavorite) {
                    score += 35;
                    relevanceReasons.push(`In your active watchlist (${sym})`);
                }
            }

            // 2. Preferred Sector Alignment
            if (item.sector) {
                const matchesSector = (prefs.preferredSectors || []).some(
                    (s) => s.toLowerCase() === item.sector?.toLowerCase()
                );
                if (matchesSector) {
                    score += 25;
                    relevanceReasons.push(`Matches your ${item.sector} sector preference`);
                }
            } else if (item.content) {
                // Check if preferred sectors are mentioned in text
                for (const sec of prefs.preferredSectors || []) {
                    if (item.content.toLowerCase().includes(sec.toLowerCase())) {
                        score += 20;
                        relevanceReasons.push(`Matches sector focus: ${sec}`);
                        break;
                    }
                }
            }

            // 3. Risk Tolerance Alignment
            if (item.category === 'risk') {
                if (riskMultiplier > 1.1) {
                    const riskBoost = Math.round(30 * riskMultiplier);
                    score += riskBoost;
                    relevanceReasons.push('Prioritized for conservative capital preservation');
                } else if (riskMultiplier < 0.9) {
                    score -= 10; // Aggressive momentum profiles discount broad macro risk
                }
                if (item.severity === 'critical') score += 15;
                else if (item.severity === 'warning') score += 5;
            }

            // 4. Analysis Style & Horizon Alignment
            if (analysisBias === 'technical') {
                if (item.category === 'technical' || item.category === 'volume') {
                    score += 30;
                    relevanceReasons.push('Matches technical & momentum analysis preference');
                }
            } else if (analysisBias === 'fundamental') {
                if (item.category === 'fundamental' || item.category === 'macro') {
                    score += 30;
                    relevanceReasons.push('Matches fundamental & balance sheet focus');
                }
            } else {
                // Balanced
                if (item.category === 'fundamental' || item.category === 'technical') {
                    score += 15;
                }
            }

            // 5. Experience Level Adjustments
            if (prefs.experienceLevel === 'beginner') {
                if (item.category === 'macro' || item.category === 'risk') {
                    score += 15;
                    relevanceReasons.push('High-impact macro context for your experience level');
                }
                if (item.category === 'volume' && !item.relatedSymbol) {
                    score -= 10;
                }
            } else if (prefs.experienceLevel === 'advanced' || prefs.experienceLevel === 'institutional') {
                if (item.category === 'volume' || item.category === 'technical') {
                    score += 20;
                    relevanceReasons.push('Actionable quantitative & flow signal');
                }
            }

            // 6. Recency Boost
            const ageMs = Date.now() - (item.timestamp || Date.now());
            const hoursOld = ageMs / (1000 * 60 * 60);
            if (hoursOld < 1) score += 15;
            else if (hoursOld < 4) score += 8;

            if (relevanceReasons.length === 0) {
                relevanceReasons.push('Broad market interest');
            }

            return {
                item: {
                    id: item.id,
                    title: item.title,
                    content: item.content,
                    category: item.category,
                    relatedSymbol: item.relatedSymbol,
                    score: Math.min(100, Math.max(1, score)),
                    relevanceReasons,
                    severity: item.severity,
                    timeAgo: item.timeAgo || 'recent',
                    timestamp: item.timestamp || Date.now(),
                },
                rawScore: score,
            };
        });

        // Sort descending by calculated raw score before capping
        return scored.sort((a, b) => b.rawScore - a.rawScore).map((s) => s.item);
    }
}
