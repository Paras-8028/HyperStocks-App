import { IAIIntelligenceService } from './IAIIntelligenceService';
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
import { AI_CONFIG } from '@/config/ai';
import {
    COPILOT_SYSTEM_PROMPT,
    MARKET_BRIEFING_PROMPT,
    NEWS_SENTIMENT_PROMPT,
    PORTFOLIO_AUDIT_PROMPT,
    STOCK_THESIS_PROMPT,
} from './prompts';

import { GeminiProvider } from './providers/GeminiProvider';

export class GeminiAIService implements IAIIntelligenceService {
    private readonly apiKey: string;
    private readonly provider: GeminiProvider;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
        this.provider = new GeminiProvider(this.apiKey);
    }

    private cleanJson(raw: string): string {
        let cleaned = raw.trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');

        // If JSON array is outermost
        if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            return cleaned.substring(firstBracket, lastBracket + 1).trim();
        }

        // If JSON object is outermost
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            return cleaned.substring(firstBrace, lastBrace + 1).trim();
        }

        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        return cleaned.trim();
    }

    private async callGemini(
        prompt: string,
        systemInstruction?: string
    ): Promise<ApiResult<string>> {
        const res = await this.provider.generateResponse({
            messages: [{ role: 'user', content: prompt }],
            systemInstruction,
            temperature: AI_CONFIG.temperature,
            maxTokens: AI_CONFIG.maxTokens,
        });

        if (!res.success) {
            return {
                success: false,
                error: res.error,
                code: res.code,
                structuredError: res.structuredError,
            };
        }

        return {
            success: true,
            data: res.data.content,
        };
    }

    async generateStockThesis(
        symbol: string,
        context?: CopilotContext
    ): Promise<ApiResult<StockThesis>> {
        const cleanSymbol = symbol.trim().toUpperCase();
        const quoteStr = context?.quote
            ? `Price: $${context.quote.currentPrice}, Daily Change: ${context.quote.percentChange}% (High: $${context.quote.highPrice}, Low: $${context.quote.lowPrice})`
            : 'Live quote data pending';

        const metricsStr = context?.metrics
            ? `P/E: ${context.metrics.peRatio ?? 'N/A'}, Beta: ${context.metrics.beta ?? 'N/A'}, 52W High: $${context.metrics.fiftyTwoWeekHigh ?? 'N/A'}, 52W Low: $${context.metrics.fiftyTwoWeekLow ?? 'N/A'}, Div Yield: ${context.metrics.dividendYield ?? 0}%`
            : 'Financial metrics pending';

        const userStr = context?.userProfile
            ? `Goals: ${context.userProfile.investmentGoals || 'Growth'}, Risk: ${context.userProfile.riskTolerance || 'Medium'}, Sector: ${context.userProfile.preferredIndustry || 'General'}`
            : 'Standard retail investor profile';

        const prompt = STOCK_THESIS_PROMPT(
            cleanSymbol,
            context?.profile?.name || cleanSymbol,
            quoteStr,
            metricsStr,
            userStr
        );

        const aiRes = await this.callGemini(prompt, AI_CONFIG.systemInstruction);

        if (!aiRes.success) {
            return aiRes;
        }

        try {
            const cleaned = this.cleanJson(aiRes.data);
            const parsed = JSON.parse(cleaned) as StockThesis;
            return {
                success: true,
                data: parsed,
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to parse AI stock thesis: ${err?.message}`,
                code: 'PARSE_ERROR',
            };
        }
    }

    async analyzeNewsSentiment(
        articles: NewsArticleEntity[]
    ): Promise<ApiResult<NewsSentimentAnalysis[]>> {
        if (!articles || articles.length === 0) {
            return { success: true, data: [] };
        }

        const miniArticles = articles.slice(0, 6).map((a) => ({
            id: a.id,
            headline: a.headline,
            summary: a.summary?.slice(0, 200),
            source: a.source,
            symbol: a.relatedSymbol,
        }));

        const prompt = NEWS_SENTIMENT_PROMPT(JSON.stringify(miniArticles, null, 2));
        const aiRes = await this.callGemini(prompt, AI_CONFIG.systemInstruction);

        if (!aiRes.success) return aiRes;

        try {
            const cleaned = this.cleanJson(aiRes.data);
            const parsed = JSON.parse(cleaned) as NewsSentimentAnalysis[];
            return {
                success: true,
                data: parsed,
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to parse AI news sentiment: ${err?.message}`,
                code: 'PARSE_ERROR',
            };
        }
    }

    async auditPortfolioRisk(
        positions: PortfolioPosition[],
        profile?: Partial<UserPreferences>
    ): Promise<ApiResult<PortfolioRiskAudit>> {
        const holdingsJson = JSON.stringify(
            positions.map((p) => ({
                symbol: p.symbol,
                shares: p.shares,
                costBasis: p.costBasis,
                currentPrice: p.currentPrice,
                allocationPercent: p.allocationPercent,
            })),
            null,
            2
        );

        const userStr = profile
            ? `Goals: ${profile.investmentGoals || 'Growth'}, Risk Tolerance: ${profile.riskTolerance || 'Medium'}`
            : 'Standard Balanced profile';

        const prompt = PORTFOLIO_AUDIT_PROMPT(holdingsJson, userStr);
        const aiRes = await this.callGemini(prompt, AI_CONFIG.systemInstruction);

        if (!aiRes.success) return aiRes;

        try {
            const cleaned = this.cleanJson(aiRes.data);
            const parsed = JSON.parse(cleaned) as PortfolioRiskAudit;
            return {
                success: true,
                data: parsed,
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to parse portfolio risk audit: ${err?.message}`,
                code: 'PARSE_ERROR',
            };
        }
    }

    async generateMarketBriefing(
        watchlistSymbols: string[],
        profile?: Partial<UserPreferences>
    ): Promise<ApiResult<MarketBriefing>> {
        const userStr = profile
            ? `Investment Goals: ${profile.investmentGoals}, Risk: ${profile.riskTolerance}, Sector: ${profile.preferredIndustry}`
            : 'Goal: Growth, Risk: Medium, Sector: Technology';

        const prompt = MARKET_BRIEFING_PROMPT(watchlistSymbols, userStr);
        const aiRes = await this.callGemini(prompt, AI_CONFIG.systemInstruction);

        if (!aiRes.success) return aiRes;

        try {
            const cleaned = this.cleanJson(aiRes.data);
            const parsed = JSON.parse(cleaned) as MarketBriefing;
            return {
                success: true,
                data: parsed,
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to parse market briefing: ${err?.message}`,
                code: 'PARSE_ERROR',
            };
        }
    }

    async chatCopilot(
        messages: CopilotMessage[],
        context?: CopilotContext
    ): Promise<ApiResult<CopilotMessage>> {
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg) {
            return {
                success: false,
                error: 'No messages provided to copilot',
                code: 'INVALID_INPUT',
            };
        }

        const contextSummary = `
Context:
- Current Ticker: ${context?.currentSymbol || 'None'}
- Price: ${context?.quote ? `$${context.quote.currentPrice} (${context.quote.percentChange}%)` : 'N/A'}
- User Watchlist: ${context?.watchlistSymbols?.join(', ') || 'N/A'}
- User Profile: ${context?.userProfile?.investmentGoals || 'Growth'}, Risk: ${context?.userProfile?.riskTolerance || 'Medium'}
`;

        const prompt = `
${contextSummary}

User Question: ${lastMsg.content}

Provide an analytical, objective response with actionable insights, bulleted key points, and standard risk disclosure.
`;

        const aiRes = await this.callGemini(prompt, COPILOT_SYSTEM_PROMPT);

        if (!aiRes.success) return aiRes;

        const responseMessage: CopilotMessage = {
            id: `copilot-${Date.now()}`,
            role: 'assistant',
            content: aiRes.data,
            timestamp: Date.now(),
            relatedSymbols: context?.currentSymbol ? [context.currentSymbol] : undefined,
        };

        return {
            success: true,
            data: responseMessage,
        };
    }

    async generateCompletion(
        prompt: string,
        systemInstruction?: string
    ): Promise<ApiResult<string>> {
        return this.callGemini(prompt, systemInstruction);
    }
}

