import { IPersonalizationService } from './IPersonalizationService';
import { ApiResult } from '@/types/api';
import {
    DEFAULT_USER_PREFERENCES,
    GoalProgress,
    PersonalizationContext,
    ScoredInsight,
    ScoredOpportunity,
    UserPreferences,
} from '@/types/personalization';
import { OpportunityItem } from '@/types/ai';
import { PortfolioPosition } from '@/types/portfolio';
import { connectToDatabase } from '@/database/mongoose';
import { PersonalizationContextBuilder } from './PersonalizationContext';
import { InsightRankingEngine, RawInsightItem } from './InsightRanking';
import { RecommendationEngine } from './RecommendationEngine';

export class PersonalizationService implements IPersonalizationService {
    private recommendationEngine = new RecommendationEngine();

    async getUserProfile(userIdOrEmail: string): Promise<ApiResult<UserPreferences>> {
        if (!userIdOrEmail || userIdOrEmail === 'guest') {
            return {
                success: true,
                data: { ...DEFAULT_USER_PREFERENCES },
            };
        }

        try {
            const mongoose = await connectToDatabase();
            const { UserPreferenceModel } = await import('@/database/models/user_preference.model');

            // 1. Primary lookup by Clerk userId
            let doc = await UserPreferenceModel.findOne({ userId: userIdOrEmail }).lean();

            // 2. Secondary lookup by email (for migration)
            if (!doc && userIdOrEmail.includes('@')) {
                doc = await UserPreferenceModel.findOne({ email: userIdOrEmail }).lean();
            }

            // 3. Fallback check in legacy 'user' collection if exists
            if (!doc && mongoose.connection.db) {
                const legacy = await mongoose.connection.db
                    .collection('user')
                    .findOne(userIdOrEmail.includes('@') ? { email: userIdOrEmail } : { id: userIdOrEmail });

                if (legacy) {
                    doc = await UserPreferenceModel.findOneAndUpdate(
                        { userId: userIdOrEmail.startsWith('user_') ? userIdOrEmail : legacy.id || String(legacy._id) },
                        {
                            $setOnInsert: {
                                userId: userIdOrEmail.startsWith('user_') ? userIdOrEmail : legacy.id || String(legacy._id),
                                email: legacy.email || '',
                                name: legacy.name || 'Investor',
                                experienceLevel: legacy.experienceLevel || DEFAULT_USER_PREFERENCES.experienceLevel,
                                riskTolerance: legacy.riskTolerance || DEFAULT_USER_PREFERENCES.riskTolerance,
                                preferredIndustry: legacy.preferredIndustry || DEFAULT_USER_PREFERENCES.preferredIndustry,
                            },
                        },
                        { upsert: true, new: true }
                    ).lean();
                }
            }

            if (!doc) {
                return {
                    success: true,
                    data: {
                        ...DEFAULT_USER_PREFERENCES,
                        userId: userIdOrEmail,
                        email: userIdOrEmail.includes('@') ? userIdOrEmail : '',
                    },
                };
            }

            const prefs: UserPreferences = {
                userId: doc.userId,
                email: doc.email || '',
                name: doc.name || 'Investor',
                country: doc.country || 'US',
                experienceLevel: doc.experienceLevel || DEFAULT_USER_PREFERENCES.experienceLevel,
                investmentGoals: doc.investmentGoals || DEFAULT_USER_PREFERENCES.investmentGoals,
                riskTolerance: doc.riskTolerance || DEFAULT_USER_PREFERENCES.riskTolerance,
                preferredSectors: doc.preferredSectors || DEFAULT_USER_PREFERENCES.preferredSectors,
                preferredRegions: doc.preferredRegions || DEFAULT_USER_PREFERENCES.preferredRegions,
                investmentHorizon: doc.investmentHorizon || DEFAULT_USER_PREFERENCES.investmentHorizon,
                preferredAnalysisStyle: doc.preferredAnalysisStyle || DEFAULT_USER_PREFERENCES.preferredAnalysisStyle,
                favoriteStocks: doc.favoriteStocks || DEFAULT_USER_PREFERENCES.favoriteStocks,
                preferredIndustry: doc.preferredIndustry || DEFAULT_USER_PREFERENCES.preferredIndustry,
                notificationPreferences: doc.notificationPreferences || DEFAULT_USER_PREFERENCES.notificationPreferences,
                aiPersonaPreference: doc.aiPersonaPreference || DEFAULT_USER_PREFERENCES.aiPersonaPreference,
                onboardingCompleted: doc.onboardingCompleted ?? Boolean(doc.experienceLevel || doc.riskTolerance),
                lastUpdated: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
            };

            return { success: true, data: prefs };
        } catch (err: any) {
            console.error('PersonalizationService.getUserProfile error:', err);
            return {
                success: true,
                data: {
                    ...DEFAULT_USER_PREFERENCES,
                    userId: userIdOrEmail,
                    email: userIdOrEmail.includes('@') ? userIdOrEmail : '',
                },
            };
        }
    }

    async updatePreferences(
        userIdOrEmail: string,
        prefs: Partial<UserPreferences>
    ): Promise<ApiResult<UserPreferences>> {
        if (!userIdOrEmail || userIdOrEmail === 'guest') {
            return {
                success: true,
                data: { ...DEFAULT_USER_PREFERENCES, ...prefs },
            };
        }

        try {
            await connectToDatabase();
            const { UserPreferenceModel } = await import('@/database/models/user_preference.model');

            const isEmail = userIdOrEmail.includes('@');
            const query = isEmail ? { email: userIdOrEmail } : { userId: userIdOrEmail };

            const updateFields: Record<string, any> = {
                updatedAt: new Date(),
                ...(prefs.email && { email: prefs.email }),
                ...(prefs.name && { name: prefs.name }),
                ...(prefs.country && { country: prefs.country }),
                ...(prefs.experienceLevel && { experienceLevel: prefs.experienceLevel }),
                ...(prefs.investmentGoals && {
                    investmentGoals: Array.isArray(prefs.investmentGoals)
                        ? prefs.investmentGoals
                        : [prefs.investmentGoals],
                }),
                ...(prefs.riskTolerance && { riskTolerance: prefs.riskTolerance }),
                ...(prefs.preferredSectors && { preferredSectors: prefs.preferredSectors }),
                ...(prefs.preferredRegions && { preferredRegions: prefs.preferredRegions }),
                ...(prefs.investmentHorizon && { investmentHorizon: prefs.investmentHorizon }),
                ...(prefs.preferredAnalysisStyle && { preferredAnalysisStyle: prefs.preferredAnalysisStyle }),
                ...(prefs.favoriteStocks && { favoriteStocks: prefs.favoriteStocks }),
                ...(prefs.preferredIndustry && { preferredIndustry: prefs.preferredIndustry }),
                ...(prefs.notificationPreferences && { notificationPreferences: prefs.notificationPreferences }),
                ...(prefs.aiPersonaPreference && { aiPersonaPreference: prefs.aiPersonaPreference }),
                ...(prefs.onboardingCompleted !== undefined && { onboardingCompleted: prefs.onboardingCompleted }),
            };

            if (!isEmail) {
                updateFields.userId = userIdOrEmail;
            }

            await UserPreferenceModel.findOneAndUpdate(query, { $set: updateFields }, { upsert: true, new: true });

            return this.getUserProfile(userIdOrEmail);
        } catch (err: any) {
            console.error('PersonalizationService.updatePreferences error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to update preferences',
                code: 'DB_ERROR',
            };
        }
    }

    async getPersonalizationContext(
        emailOrId: string,
        watchlistSymbols: string[] = [],
        holdings: PortfolioPosition[] = []
    ): Promise<PersonalizationContext> {
        const prefRes = await this.getUserProfile(emailOrId);
        const prefs = prefRes.success ? prefRes.data : DEFAULT_USER_PREFERENCES;
        return PersonalizationContextBuilder.build(prefs, watchlistSymbols, holdings);
    }

    rankInsights(
        items: RawInsightItem[],
        context: PersonalizationContext
    ): ScoredInsight[] {
        return InsightRankingEngine.rankInsights(items, context);
    }

    getRecommendations(
        candidates: OpportunityItem[],
        context: PersonalizationContext,
        limit = 6
    ): ScoredOpportunity[] {
        return this.recommendationEngine.recommend(candidates, context, limit);
    }

    getGoalRecommendations(profile: Partial<UserPreferences>): GoalProgress {
        const goals = Array.isArray(profile.investmentGoals)
            ? profile.investmentGoals[0]
            : profile.investmentGoals || 'Growth';
        const risk = profile.riskTolerance || 'Medium';

        let targetHorizonYears = 5;
        let recommendedAllocation: Record<string, number> = {
            'Large Cap Equities': 40,
            'Growth & Tech': 30,
            'Fixed Income & Bonds': 20,
            'Cash & Equivalents': 10,
        };

        if (goals === 'growth' || goals === 'Growth' || risk === 'High' || risk === 'aggressive') {
            targetHorizonYears = 8;
            recommendedAllocation = {
                'Growth & Tech': 50,
                'Large Cap Equities': 30,
                'Emerging Sectors': 15,
                'Cash & Equivalents': 5,
            };
        } else if (goals === 'income' || goals === 'Income' || risk === 'Low' || risk === 'conservative') {
            targetHorizonYears = 3;
            recommendedAllocation = {
                'Dividend Aristocrats': 40,
                'Fixed Income & Bonds': 40,
                'Real Estate / REITs': 10,
                'Cash & Equivalents': 10,
            };
        } else if (goals === 'capital_preservation' || goals === 'Conservative') {
            targetHorizonYears = 2;
            recommendedAllocation = {
                'Treasuries & Bonds': 50,
                'Defensive Value': 30,
                'Cash & Equivalents': 20,
            };
        }

        return {
            goal: goals,
            targetHorizonYears,
            recommendedAllocation,
        };
    }
}
