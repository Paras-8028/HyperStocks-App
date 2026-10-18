import { PortfolioService } from './PortfolioService';
import { IPortfolioService } from './IPortfolioService';

let portfolioServiceInstance: IPortfolioService | null = null;

export function getPortfolioService(): IPortfolioService {
    if (!portfolioServiceInstance) {
        portfolioServiceInstance = new PortfolioService();
    }
    return portfolioServiceInstance;
}

export * from './IPortfolioService';
export * from './PortfolioService';
