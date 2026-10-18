import { ApiResult } from '@/types/api';
import { PortfolioPosition, PortfolioSummary } from '@/types/portfolio';

export interface IPortfolioService {
    getPositions(userId: string): Promise<ApiResult<PortfolioPosition[]>>;
    addPosition(
        userId: string,
        input: { symbol: string; shares: number; costBasis: number; notes?: string }
    ): Promise<ApiResult<PortfolioPosition>>;
    removePosition(userId: string, positionId: string): Promise<ApiResult<boolean>>;
    calculatePortfolioSummary(positions: PortfolioPosition[]): Promise<PortfolioSummary>;
}
