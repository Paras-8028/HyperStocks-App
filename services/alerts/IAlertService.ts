import { ApiResult } from '@/types/api';
import { AlertEntity, CreateAlertInput } from '@/types/alerts';

export interface IAlertService {
    getUserAlerts(userId: string): Promise<ApiResult<AlertEntity[]>>;
    getAlertsForSymbol(userId: string, symbol: string): Promise<ApiResult<AlertEntity[]>>;
    createAlert(userId: string, input: CreateAlertInput): Promise<ApiResult<AlertEntity>>;
    deleteAlert(userId: string, alertId: string): Promise<ApiResult<boolean>>;
    evaluateAlerts(userId: string): Promise<ApiResult<Array<AlertEntity & { isTriggered: boolean }>>>;
}
