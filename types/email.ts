import { SmartAlertCategory } from './alerts';

export interface EmailMarketContext {
    sp500Change?: number;
    nasdaqChange?: number;
    sectorName?: string;
    sectorPerformance?: number;
    marketBreadth?: string;
}

export interface EmailNewsItem {
    headline: string;
    source: string;
    summary?: string;
    url?: string;
    datetime?: number;
}

export interface EmailEarningsData {
    quarter?: string;
    revenue?: string | number;
    expectedRevenue?: string | number;
    eps?: number;
    expectedEps?: number;
    surprisePercent?: number;
    guidance?: string;
}

export interface EmailPortfolioContext {
    totalValue?: number;
    dailyChange?: number;
    dailyPercent?: number;
    positionWeight?: number;
    sharesHeld?: number;
    topContributor?: string;
    topDetractor?: string;
    concentrationRisk?: string;
    sectorExposure?: Record<string, number>;
}

export interface AlertEmailData {
    userName: string;
    userEmail: string;
    alertType: SmartAlertCategory;
    ticker: string;
    companyName?: string;
    currentPrice: number;
    previousPrice?: number;
    priceChange?: number;
    percentageChange?: number;
    triggerValue?: number | string;
    triggerCondition?: 'above' | 'below' | string;
    volume?: number;
    averageVolume?: number;
    sentiment?: 'bullish' | 'bearish' | 'neutral' | string;
    marketContext?: EmailMarketContext;
    sectorContext?: string;
    relevantNews?: EmailNewsItem[];
    earningsData?: EmailEarningsData;
    portfolioContext?: EmailPortfolioContext;
    aiSummary?: string;
    aiAnalysis?: string;
    riskLevel?: 'low' | 'moderate' | 'elevated' | 'critical' | string;
    whyItMatters: string;
    hyperstocksUrl: string;
    timestamp: number;
    detectedSignal?: string;
    actionLabel?: string;
    actionUrl?: string;
}

export interface IndexPerformance {
    name: string;
    value: number;
    change: number;
    percentChange: number;
}

export interface SectorMovement {
    name: string;
    change: number;
}

export interface WatchlistMoverItem {
    symbol: string;
    companyName?: string;
    price: number;
    change: number;
    percentChange: number;
}

export interface CatalystItem {
    title: string;
    type: 'earnings' | 'economic' | 'fed' | 'market';
    dateOrTime: string;
    impact: string;
}

export interface DailyDigestEmailData {
    userName: string;
    userEmail: string;
    date: string;
    marketOverview: {
        indices: IndexPerformance[];
        directionSummary: string;
        topSectors: SectorMovement[];
    };
    aiMarketSummary: string;
    watchlistMovers: WatchlistMoverItem[];
    portfolioSummary?: {
        totalValue: number;
        dailyGainLoss: number;
        dailyGainLossPercent: number;
        topContributor?: string;
        topDetractor?: string;
        keyRiskNotice?: string;
    };
    topNews: EmailNewsItem[];
    catalystsToWatch: CatalystItem[];
    hyperstocksUrl: string;
}

export interface EmailSendResult {
    success: boolean;
    id?: string;
    error?: string;
    skipped?: boolean;
    reason?: string;
}
