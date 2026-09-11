export type AlertCondition = 'above' | 'below';
export type AlertStatus = 'active' | 'triggered' | 'dismissed';

export type SmartAlertCategory =
    | 'price'
    | 'percentage_movement'
    | 'volume'
    | 'technical_signal'
    | 'news'
    | 'earnings'
    | 'portfolio_risk'
    | 'ai_insight';

export type SmartAlertSeverity = 'critical' | 'warning' | 'info' | 'advisory';

export interface SmartAlertAction {
    type: 'navigate' | 'trade' | 'rebalance' | 'dismiss';
    label: string;
    href?: string;
}

export interface SmartAlertItem {
    id: string;
    userId: string;
    category: SmartAlertCategory;
    title: string;
    event: string;
    whyItMatters: string;
    relatedSymbol?: string;
    severity: SmartAlertSeverity;
    priorityScore: number; // 0 to 100
    timestamp: number;
    isRead: boolean;
    action: SmartAlertAction;
}

export interface AlertNotificationPreferences {
    enabledCategories: Record<SmartAlertCategory, boolean>;
    minSeverity: SmartAlertSeverity;
    emailDigest: boolean;
    pushEnabled: boolean;
    quietHours?: {
        enabled: boolean;
        start: string; // "22:00"
        end: string;   // "07:00"
    };
}

export const DEFAULT_ALERT_PREFERENCES: AlertNotificationPreferences = {
    enabledCategories: {
        price: true,
        percentage_movement: true,
        volume: true,
        technical_signal: true,
        news: true,
        earnings: true,
        portfolio_risk: true,
        ai_insight: true,
    },
    minSeverity: 'advisory',
    emailDigest: true,
    pushEnabled: true,
    quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
    },
};

// Legacy / Existing Price Target Alert interface
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
    note?: string;
}
