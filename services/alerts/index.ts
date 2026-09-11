import { AlertService } from './AlertService';
import { IAlertService } from './IAlertService';

let alertServiceInstance: IAlertService | null = null;

export function getAlertService(): IAlertService {
    if (!alertServiceInstance) {
        alertServiceInstance = new AlertService();
    }
    return alertServiceInstance;
}

export * from './IAlertService';
export * from './AlertService';
export * from './AlertPriorityScorer';
export * from './SmartAlertGenerator';

