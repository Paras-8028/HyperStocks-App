import { FinnhubMarketService } from './FinnhubMarketService';
import { IMarketDataProvider } from './IMarketDataProvider';

let marketServiceInstance: IMarketDataProvider | null = null;

export function getMarketService(): IMarketDataProvider {
    if (!marketServiceInstance) {
        marketServiceInstance = new FinnhubMarketService();
    }
    return marketServiceInstance;
}

export * from './IMarketDataProvider';
export * from './FinnhubMarketService';
