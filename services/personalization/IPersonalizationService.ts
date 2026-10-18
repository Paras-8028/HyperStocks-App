import { ApiResult } from '@/types/api';
import {
    GoalProgress,
    PersonalizationContext,
    ScoredInsight,
    ScoredOpportunity,
    UserPreferences,
} from '@/types/personalization';
import { OpportunityItem } from '@/types/ai';
import { RawInsightItem } from './InsightRanking';
import { PortfolioPosition } from '@/types/portfolio';

export interface IPersonalizationService {
    getUserProfile(emailOrId: string): Promise<ApiResult<UserPreferences>>;
    updatePreferences(
        emailOrId: string,
        prefs: Partial<UserPreferences>
    ): Promise<ApiResult<UserPreferences>>;
    getPersonalizationContext(
        emailOrId: string,
        watchlistSymbols?: string[],
        holdings?: PortfolioPosition[]
    ): Promise<PersonalizationContext>;
    rankInsights(
        items: RawInsightItem[],
        context: PersonalizationContext
    ): ScoredInsight[];
    getRecommendations(
        candidates: OpportunityItem[],
        context: PersonalizationContext,
        limit?: number
    ): ScoredOpportunity[];
    getGoalRecommendations(profile: Partial<UserPreferences>): GoalProgress;
}
