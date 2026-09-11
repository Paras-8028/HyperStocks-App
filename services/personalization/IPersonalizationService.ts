import { ApiResult } from '@/types/api';
import { GoalProgress, UserPreferences } from '@/types/personalization';

export interface IPersonalizationService {
    getUserProfile(emailOrId: string): Promise<ApiResult<UserPreferences>>;
    updatePreferences(
        emailOrId: string,
        prefs: Partial<UserPreferences>
    ): Promise<ApiResult<UserPreferences>>;
    getGoalRecommendations(profile: Partial<UserPreferences>): GoalProgress;
}
