export const MARKET_CONFIG = {
    cacheTTL: {
        quoteSeconds: 30,
        searchSeconds: 1800,
        profileSeconds: 3600 * 6,
        newsSeconds: 300,
        financialsSeconds: 3600 * 12,
    },
    refreshIntervals: {
        liveQuoteMs: 15000,
        newsFeedMs: 60000 * 5,
        portfolioRefreshMs: 30000,
    },
    limits: {
        maxWatchlistItems: 50,
        maxPortfolioPositions: 100,
        maxAlertsPerStock: 5,
        maxNewsPerQuery: 10,
    },
    defaultSectors: [
        'Technology',
        'Healthcare',
        'Finance',
        'Energy',
        'Consumer Cyclical',
        'Industrial',
        'Utilities',
        'Communication Services',
    ],
} as const;

export type MarketConfig = typeof MARKET_CONFIG;
