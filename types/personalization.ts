export type RiskTolerance = 'Low' | 'Medium' | 'High';
export type InvestmentGoal = 'Growth' | 'Income' | 'Balanced' | 'Conservative';

export interface UserPreferences {
    userId: string;
    email: string;
    name: string;
    country: string;
    investmentGoals: InvestmentGoal | string;
    riskTolerance: RiskTolerance | string;
    preferredIndustry: string;
    notificationPreferences?: {
        dailyEmailBriefing: boolean;
        priceAlertPush: boolean;
        aiSignals: boolean;
    };
    aiPersonaPreference?: 'concise' | 'in_depth' | 'technical';
}

export interface GoalProgress {
    goal: InvestmentGoal | string;
    targetHorizonYears?: number;
    recommendedAllocation: Record<string, number>;
}
