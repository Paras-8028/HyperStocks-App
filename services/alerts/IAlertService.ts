import { ApiResult } from '@/types/api';
import {
    AlertEntity,
    AlertNotificationPreferences,
    CreateAlertInput,
    SmartAlertCategory,
    SmartAlertItem,
} from '@/types/alerts';

export interface IAlertService {
    // Legacy price target alerts
    getUserAlerts(userId: string): Promise<ApiResult<AlertEntity[]>>;
    getAlertsForSymbol(userId: string, symbol: string): Promise<ApiResult<AlertEntity[]>>;
    createAlert(userId: string, input: CreateAlertInput): Promise<ApiResult<AlertEntity>>;
    deleteAlert(userId: string, alertId: string): Promise<ApiResult<boolean>>;
    evaluateAlerts(userId: string): Promise<ApiResult<Array<AlertEntity & { isTriggered: boolean }>>>;

    // Smart AI Alerts & Preferences
    getSmartAlerts(
        userId: string,
        categoryFilter?: SmartAlertCategory,
        unreadOnly?: boolean
    ): Promise<ApiResult<SmartAlertItem[]>>;
    markAlertRead(userId: string, alertId: string): Promise<ApiResult<boolean>>;
    markAllAlertsRead(userId: string): Promise<ApiResult<boolean>>;
    getUserAlertPreferences(userId: string): Promise<ApiResult<AlertNotificationPreferences>>;
    updateAlertPreferences(
        userId: string,
        preferences: Partial<AlertNotificationPreferences>
    ): Promise<ApiResult<AlertNotificationPreferences>>;
}

