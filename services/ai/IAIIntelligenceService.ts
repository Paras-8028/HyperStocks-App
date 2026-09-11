import { ApiResult } from '@/types/api';
import {
    CopilotContext,
    CopilotMessage,
    MarketBriefing,
    NewsSentimentAnalysis,
    PortfolioRiskAudit,
    StockThesis,
} from '@/types/ai';
import { NewsArticleEntity } from '@/types/news';
import { PortfolioPosition } from '@/types/portfolio';
import { UserPreferences } from '@/types/personalization';

export interface IAIIntelligenceService {
    generateStockThesis(
        symbol: string,
        context?: CopilotContext
    ): Promise<ApiResult<StockThesis>>;

    analyzeNewsSentiment(
        articles: NewsArticleEntity[]
    ): Promise<ApiResult<NewsSentimentAnalysis[]>>;

    auditPortfolioRisk(
        positions: PortfolioPosition[],
        profile?: Partial<UserPreferences>
    ): Promise<ApiResult<PortfolioRiskAudit>>;

    generateMarketBriefing(
        watchlistSymbols: string[],
        profile?: Partial<UserPreferences>
    ): Promise<ApiResult<MarketBriefing>>;

    chatCopilot(
        messages: CopilotMessage[],
        context?: CopilotContext
    ): Promise<ApiResult<CopilotMessage>>;
}
