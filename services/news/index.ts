import { FinnhubNewsService } from './FinnhubNewsService';
import { INewsService } from './INewsService';

let newsServiceInstance: INewsService | null = null;

export function getNewsService(): INewsService {
    if (!newsServiceInstance) {
        newsServiceInstance = new FinnhubNewsService();
    }
    return newsServiceInstance;
}

export * from './INewsService';
export * from './FinnhubNewsService';
