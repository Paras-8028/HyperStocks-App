import { IPersonalizationService } from './IPersonalizationService';
import { ApiResult } from '@/types/api';
import { GoalProgress, UserPreferences } from '@/types/personalization';
import { connectToDatabase } from '@/database/mongoose';

export class PersonalizationService implements IPersonalizationService {
    async getUserProfile(emailOrId: string): Promise<ApiResult<UserPreferences>> {
        try {
            const mongoose = await connectToDatabase();
            const db = mongoose.connection.db;
            if (!db) {
                return { success: false, error: 'Database not connected', code: 'DB_ERROR' };
            }

            const isEmail = emailOrId.includes('@');
            const query = isEmail ? { email: emailOrId } : { id: emailOrId };

            const user = await db.collection('user').findOne(query);

            if (!user) {
                return { success: false, error: 'User profile not found', code: 'NOT_FOUND' };
            }

            const prefs: UserPreferences = {
                userId: user.id || String(user._id),
                email: user.email,
                name: user.name || 'Investor',
                country: user.country || 'US',
                investmentGoals: user.investmentGoals || 'Growth',
                riskTolerance: user.riskTolerance || 'Medium',
                preferredIndustry: user.preferredIndustry || 'Technology',
                notificationPreferences: user.notificationPreferences || {
                    dailyEmailBriefing: true,
                    priceAlertPush: true,
                    aiSignals: true,
                },
                aiPersonaPreference: user.aiPersonaPreference || 'in_depth',
            };

            return { success: true, data: prefs };
        } catch (err: any) {
            console.error('PersonalizationService.getUserProfile error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to fetch user profile',
                code: 'DB_ERROR',
            };
        }
    }

    async updatePreferences(
        emailOrId: string,
        prefs: Partial<UserPreferences>
    ): Promise<ApiResult<UserPreferences>> {
        try {
            const mongoose = await connectToDatabase();
            const db = mongoose.connection.db;
            if (!db) {
                return { success: false, error: 'Database not connected', code: 'DB_ERROR' };
            }

            const isEmail = emailOrId.includes('@');
            const query = isEmail ? { email: emailOrId } : { id: emailOrId };

            await db.collection('user').updateOne(query, {
                $set: {
                    ...(prefs.investmentGoals && { investmentGoals: prefs.investmentGoals }),
                    ...(prefs.riskTolerance && { riskTolerance: prefs.riskTolerance }),
                    ...(prefs.preferredIndustry && { preferredIndustry: prefs.preferredIndustry }),
                    ...(prefs.notificationPreferences && { notificationPreferences: prefs.notificationPreferences }),
                    ...(prefs.aiPersonaPreference && { aiPersonaPreference: prefs.aiPersonaPreference }),
                },
            });

            return this.getUserProfile(emailOrId);
        } catch (err: any) {
            console.error('PersonalizationService.updatePreferences error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to update preferences',
                code: 'DB_ERROR',
            };
        }
    }

    getGoalRecommendations(profile: Partial<UserPreferences>): GoalProgress {
        const goal = profile.investmentGoals || 'Growth';
        const risk = profile.riskTolerance || 'Medium';

        let targetHorizonYears = 5;
        let recommendedAllocation: Record<string, number> = {
            'Large Cap Equities': 40,
            'Growth & Tech': 30,
            'Fixed Income & Bonds': 20,
            'Cash & Equivalents': 10,
        };

        if (goal === 'Growth' || risk === 'High') {
            targetHorizonYears = 8;
            recommendedAllocation = {
                'Growth & Tech': 50,
                'Large Cap Equities': 30,
                'Emerging Sectors': 15,
                'Cash & Equivalents': 5,
            };
        } else if (goal === 'Income' || risk === 'Low') {
            targetHorizonYears = 3;
            recommendedAllocation = {
                'Dividend Aristocrats': 40,
                'Fixed Income & Bonds': 40,
                'Real Estate / REITs': 10,
                'Cash & Equivalents': 10,
            };
        } else if (goal === 'Conservative') {
            targetHorizonYears = 2;
            recommendedAllocation = {
                'Treasuries & Bonds': 50,
                'Defensive Value': 30,
                'Cash & Equivalents': 20,
            };
        }

        return {
            goal,
            targetHorizonYears,
            recommendedAllocation,
        };
    }
}
