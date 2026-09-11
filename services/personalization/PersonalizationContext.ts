import {
    PersonalizationContext,
    UserPreferences,
    UserProfile,
    DEFAULT_USER_PREFERENCES,
} from '@/types/personalization';
import { PortfolioPosition } from '@/types/portfolio';

export class PersonalizationContextBuilder {
    public static build(
        preferences: Partial<UserPreferences> = {},
        watchlistSymbols: string[] = [],
        holdings: PortfolioPosition[] = []
    ): PersonalizationContext {
        const mergedPrefs: UserPreferences = {
            ...DEFAULT_USER_PREFERENCES,
            ...preferences,
            preferredSectors:
                preferences.preferredSectors && preferences.preferredSectors.length > 0
                    ? preferences.preferredSectors
                    : DEFAULT_USER_PREFERENCES.preferredSectors,
            favoriteStocks:
                preferences.favoriteStocks && preferences.favoriteStocks.length > 0
                    ? preferences.favoriteStocks
                    : DEFAULT_USER_PREFERENCES.favoriteStocks,
        };

        const totalPortfolioValue = holdings.reduce(
            (sum, p) => sum + (p.currentPrice || p.costBasis) * p.shares,
            0
        );

        const profile: UserProfile = {
            preferences: mergedPrefs,
            watchlistSymbols: Array.from(new Set([...watchlistSymbols, ...(mergedPrefs.favoriteStocks || [])])),
            holdings,
            totalPortfolioValue,
        };

        return {
            userId: mergedPrefs.userId || 'guest',
            profile,
            activeSectors: mergedPrefs.preferredSectors,
            timestamp: Date.now(),
        };
    }

    /**
     * Checks if a symbol is in the user's primary universe (watchlist, holdings, or favorites)
     */
    public static isSymbolRelevant(symbol: string, context: PersonalizationContext): boolean {
        const clean = symbol.toUpperCase().trim();
        const inWatchlist = context.profile.watchlistSymbols.some((s) => s.toUpperCase() === clean);
        const inHoldings = context.profile.holdings.some((h) => h.symbol.toUpperCase() === clean);
        const inFavorites = (context.profile.preferences.favoriteStocks || []).some(
            (s) => s.toUpperCase() === clean
        );
        return inWatchlist || inHoldings || inFavorites;
    }

    /**
     * Computes the user's risk multiplier:
     * - Conservative -> High sensitivity to risks (1.5x risk weight)
     * - Moderate -> Balanced (1.0x)
     * - Aggressive -> Seeks growth, discounts small volatility risks (0.7x risk weight)
     */
    public static getRiskMultiplier(context: PersonalizationContext): number {
        const risk = context.profile.preferences.riskTolerance;
        if (risk === 'conservative' || risk === 'Low') return 1.6;
        if (risk === 'aggressive' || risk === 'High') return 0.7;
        return 1.0;
    }

    /**
     * Computes the user's analysis bias based on their style and investment horizon
     */
    public static getAnalysisBias(
        context: PersonalizationContext
    ): 'technical' | 'fundamental' | 'balanced' {
        const style = context.profile.preferences.preferredAnalysisStyle;
        const horizon = context.profile.preferences.investmentHorizon;

        if (style === 'technical' || horizon === 'short_term') return 'technical';
        if (style === 'fundamental' || horizon === 'long_term') return 'fundamental';
        return 'balanced';
    }
}
