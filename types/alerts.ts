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
    | 'ai_insight'
    | 'downside_risk';

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

export type EmailAlertFrequency = 'instant' | 'important_only' | 'daily_digest';

export interface AlertNotificationPreferences {
    enabledCategories: Record<SmartAlertCategory, boolean>;
    minSeverity: SmartAlertSeverity;
    emailDigest: boolean;
    emailAlertsEnabled?: boolean;
    emailCategories?: Record<SmartAlertCategory, boolean>;
    emailFrequency?: EmailAlertFrequency;
    pushEnabled: boolean;
    quietHours?: {
        enabled: boolean;
        start: string; // "22:00"
        end: string;   // "07:00"
    };
    // Phase 3: Quantitative Downside Risk Alert Preferences
    downsideRiskAlertsEnabled?: boolean;
    downsideRiskMinSeverity?: SmartAlertSeverity;
    downsideRiskCooldownHours?: number;
    downsideRiskCategories?: {
        volatility_spike?: boolean;
        drawdown?: boolean;
        ma_breakdown?: boolean;
        var_exceedance?: boolean;
        historical_low?: boolean;
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
        downside_risk: true,
    },
    minSeverity: 'advisory',
    emailDigest: true,
    emailAlertsEnabled: true,
    emailCategories: {
        price: true,
        percentage_movement: true,
        volume: true,
        technical_signal: true,
        news: true,
        earnings: true,
        portfolio_risk: true,
        ai_insight: true,
        downside_risk: true,
    },
    emailFrequency: 'instant',
    pushEnabled: true,
    quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
    },
    downsideRiskAlertsEnabled: true,
    downsideRiskMinSeverity: 'warning',
    downsideRiskCooldownHours: 24,
    downsideRiskCategories: {
        volatility_spike: true,
        drawdown: true,
        ma_breakdown: true,
        var_exceedance: true,
        historical_low: true,
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
