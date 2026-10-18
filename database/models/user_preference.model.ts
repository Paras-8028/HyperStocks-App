import { Schema, model, models, Document } from 'mongoose';
import {
    InvestmentExperience,
    InvestmentGoal,
    RiskTolerance,
    InvestmentHorizon,
    AnalysisStyle,
    MarketRegion,
    DEFAULT_USER_PREFERENCES,
} from '@/types/personalization';

export interface IUserPreferenceDocument extends Document {
    userId: string; // Clerk User ID (e.g. user_2...)
    email: string;
    name: string;
    country: string;
    experienceLevel: InvestmentExperience;
    investmentGoals: InvestmentGoal[];
    riskTolerance: RiskTolerance;
    preferredSectors: string[];
    preferredRegions: MarketRegion[];
    investmentHorizon: InvestmentHorizon;
    preferredAnalysisStyle: AnalysisStyle;
    favoriteStocks: string[];
    preferredIndustry?: string;
    notificationPreferences?: {
        dailyEmailBriefing: boolean;
        priceAlertPush: boolean;
        aiSignals: boolean;
    };
    aiPersonaPreference?: 'concise' | 'in_depth' | 'technical';
    onboardingCompleted: boolean;
    // Email News Scheduling Foundation (Phase 2)
    newsEmailEnabled: boolean;
    timezone: string;
    deliveryMode: 'daily' | 'interval';
    preferredDeliveryTime: string;
    scheduleIntervalMinutes: number;
    deliveryDays: number[];
    isSchedulePaused: boolean;
    lastNewsDeliveryAt?: Date;
    nextNewsDeliveryAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserPreferenceSchema = new Schema<IUserPreferenceDocument>(
    {
        userId: { type: String, required: true, unique: true, index: true },
        email: { type: String, default: '', index: true },
        name: { type: String, default: 'Investor' },
        country: { type: String, default: 'US' },
        experienceLevel: {
            type: String,
            default: DEFAULT_USER_PREFERENCES.experienceLevel,
        },
        investmentGoals: {
            type: [String] as any,
            default: Array.isArray(DEFAULT_USER_PREFERENCES.investmentGoals)
                ? DEFAULT_USER_PREFERENCES.investmentGoals
                : [DEFAULT_USER_PREFERENCES.investmentGoals],
        },
        riskTolerance: {
            type: String,
            default: DEFAULT_USER_PREFERENCES.riskTolerance,
        },
        preferredSectors: {
            type: [String] as any,
            default: DEFAULT_USER_PREFERENCES.preferredSectors,
        },
        preferredRegions: {
            type: [String] as any,
            default: DEFAULT_USER_PREFERENCES.preferredRegions,
        },
        investmentHorizon: {
            type: String,
            default: DEFAULT_USER_PREFERENCES.investmentHorizon,
        },
        preferredAnalysisStyle: {
            type: String,
            default: DEFAULT_USER_PREFERENCES.preferredAnalysisStyle,
        },
        favoriteStocks: {
            type: [String],
            default: [],
        },
        preferredIndustry: {
            type: String,
            default: DEFAULT_USER_PREFERENCES.preferredIndustry,
        },
        notificationPreferences: {
            type: Schema.Types.Mixed,
            default: DEFAULT_USER_PREFERENCES.notificationPreferences,
        },
        aiPersonaPreference: {
            type: String,
            default: DEFAULT_USER_PREFERENCES.aiPersonaPreference,
        },
        onboardingCompleted: {
            type: Boolean,
            default: false,
        },
        newsEmailEnabled: {
            type: Boolean,
            default: true,
        },
        timezone: {
            type: String,
            default: 'Asia/Kolkata',
        },
        deliveryMode: {
            type: String,
            enum: ['daily', 'interval'],
            default: 'daily',
        },
        preferredDeliveryTime: {
            type: String,
            default: '08:00',
        },
        scheduleIntervalMinutes: {
            type: Number,
            default: 240,
            min: 30,
        },
        deliveryDays: {
            type: [Number],
            default: [1, 2, 3, 4, 5],
        },
        isSchedulePaused: {
            type: Boolean,
            default: false,
        },
        lastNewsDeliveryAt: {
            type: Date,
        },
        nextNewsDeliveryAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

export const UserPreferenceModel =
    models.UserPreference ||
    model<IUserPreferenceDocument>('UserPreference', UserPreferenceSchema);
