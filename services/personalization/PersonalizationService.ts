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

    async getUserProfile(emailOrId: string): Promise<ApiResult<UserPreferences>> {
        if (!emailOrId || emailOrId === 'guest') {
            return {
                success: true,
                data: { ...DEFAULT_USER_PREFERENCES },
            };
        }

        try {
            const mongoose = await connectToDatabase();
            const db = mongoose.connection.db;
            if (!db) {
                return {
                    success: true,
                    data: { ...DEFAULT_USER_PREFERENCES, email: emailOrId },
                };
            }

            const isEmail = emailOrId.includes('@');
            const query = isEmail ? { email: emailOrId } : { id: emailOrId };

            const user = await db.collection('user').findOne(query);

            if (!user) {
                return {
                    success: true,
                    data: { ...DEFAULT_USER_PREFERENCES, email: isEmail ? emailOrId : '' },
                };
            }

            const prefs: UserPreferences = {
                userId: user.id || String(user._id),
                email: user.email,
                name: user.name || 'Investor',
                country: user.country || 'US',
                experienceLevel: user.experienceLevel || DEFAULT_USER_PREFERENCES.experienceLevel,
                investmentGoals: user.investmentGoals
                    ? Array.isArray(user.investmentGoals)
                        ? user.investmentGoals
                        : [user.investmentGoals]
                    : DEFAULT_USER_PREFERENCES.investmentGoals,
                riskTolerance: user.riskTolerance || DEFAULT_USER_PREFERENCES.riskTolerance,
                preferredSectors:
                    user.preferredSectors && user.preferredSectors.length > 0
                        ? user.preferredSectors
                        : DEFAULT_USER_PREFERENCES.preferredSectors,
                preferredRegions:
                    user.preferredRegions && user.preferredRegions.length > 0
                        ? user.preferredRegions
                        : DEFAULT_USER_PREFERENCES.preferredRegions,
                investmentHorizon: user.investmentHorizon || DEFAULT_USER_PREFERENCES.investmentHorizon,
                preferredAnalysisStyle:
                    user.preferredAnalysisStyle || DEFAULT_USER_PREFERENCES.preferredAnalysisStyle,
                favoriteStocks:
                    user.favoriteStocks && user.favoriteStocks.length > 0
                        ? user.favoriteStocks
                        : DEFAULT_USER_PREFERENCES.favoriteStocks,
                preferredIndustry: user.preferredIndustry || DEFAULT_USER_PREFERENCES.preferredIndustry,
                notificationPreferences: user.notificationPreferences || DEFAULT_USER_PREFERENCES.notificationPreferences,
                aiPersonaPreference: user.aiPersonaPreference || DEFAULT_USER_PREFERENCES.aiPersonaPreference,
                onboardingCompleted: user.onboardingCompleted ?? Boolean(user.experienceLevel || user.riskTolerance),
                lastUpdated: user.updatedAt ? new Date(user.updatedAt).toISOString() : undefined,
            };

            return { success: true, data: prefs };
        } catch (err: any) {
            console.error('PersonalizationService.getUserProfile error:', err);
            return {
                success: true,
                data: { ...DEFAULT_USER_PREFERENCES, email: emailOrId },
            };
        }
    }

    async updatePreferences(
        emailOrId: string,
        prefs: Partial<UserPreferences>
    ): Promise<ApiResult<UserPreferences>> {
        if (!emailOrId || emailOrId === 'guest') {
            return {
                success: true,
                data: { ...DEFAULT_USER_PREFERENCES, ...prefs },
            };
        }

        try {
            const mongoose = await connectToDatabase();
            const db = mongoose.connection.db;
            if (!db) {
                return { success: false, error: 'Database not connected', code: 'DB_ERROR' };
            }

            const isEmail = emailOrId.includes('@');
            const query = isEmail ? { email: emailOrId } : { id: emailOrId };

            const updateFields: Record<string, any> = {
                updatedAt: new Date(),
                ...(prefs.experienceLevel && { experienceLevel: prefs.experienceLevel }),
                ...(prefs.investmentGoals && { investmentGoals: prefs.investmentGoals }),
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

            await db.collection('user').updateOne(query, { $set: updateFields }, { upsert: true });

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
