export type AlertCondition = 'above' | 'below';
export type AlertStatus = 'active' | 'triggered' | 'dismissed';

export interface AlertEntity {
    id: string;
    userId: string;
    symbol: string;
    condition: AlertCondition;
    targetPrice: number;
    status: AlertStatus;
    createdAt: string;
    triggeredAt?: string;
    currentPrice?: number;
    distancePercent?: number;
}

export interface CreateAlertInput {
    symbol: string;
    condition: AlertCondition;
    targetPrice: number;
}
