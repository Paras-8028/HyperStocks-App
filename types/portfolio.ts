export interface PortfolioPosition {
    id: string;
    userId: string;
    symbol: string;
    shares: number;
    costBasis: number;
    buyDate?: string;
    notes?: string;
    // Computed live fields
    currentPrice?: number;
    marketValue?: number;
    totalCost?: number;
    unrealizedGainLoss?: number;
    unrealizedGainLossPercent?: number;
    allocationPercent?: number;
}

export interface PortfolioSummary {
    totalValue: number;
    totalCost: number;
    totalUnrealizedGainLoss: number;
    totalGainLossPercent: number;
    positionCount: number;
    topPerformer?: {
        symbol: string;
        gainPercent: number;
    };
    worstPerformer?: {
        symbol: string;
        lossPercent: number;
    };
    sectorAllocation: Record<string, number>;
}
