import { getAIService } from '@/services/ai';
import { CollectedAlertContext } from './AlertContextCollector';
import { SmartAlertCategory } from '@/types/alerts';

export interface AlertAIInterpretationResult {
    aiSummary: string;
    aiAnalysis: string;
    whyItMatters: string;
    riskLevel?: 'low' | 'moderate' | 'elevated' | 'critical';
}

export class AlertAIInterpreter {
    /**
     * Generates grounded AI analysis and personalized "Why This Matters" explanation.
     * Strictly factual, zero hallucination of financial metrics.
     */
    public static async interpretAlert(
        context: CollectedAlertContext,
        alertType: SmartAlertCategory,
        triggerDetails: {
            condition?: string;
            targetPrice?: number;
            percentChange?: number;
            volumeRatio?: number;
            detectedSignal?: string;
        }
    ): Promise<AlertAIInterpretationResult> {
        const {
            symbol,
            companyProfile,
            quote,
            marketContext,
            relevantNews,
            portfolioContext,
            isWatchlisted,
            isHeldInPortfolio,
            userPreferences,
        } = context;

        // 1. Build Deterministic "Why This Matters" baseline
        let whyItMatters = '';
        if (isHeldInPortfolio && portfolioContext?.positionWeight) {
            whyItMatters = `${symbol} represents ${portfolioContext.positionWeight.toFixed(1)}% of your portfolio holdings (${portfolioContext.sharesHeld} shares). Today's movement directly impacts your overall equity valuation.`;
        } else if (isWatchlisted) {
            whyItMatters = `${symbol} is an actively tracked security in your watchlist. We flagged this development based on your monitored interest.`;
        } else {
            whyItMatters = `${symbol} experienced a notable market event relative to broader benchmarks and is highlighted for your financial awareness.`;
        }

        if (userPreferences?.riskTolerance) {
            whyItMatters += ` Aligned with your ${userPreferences.riskTolerance} risk profile.`;
        }

        // 2. Determine Risk Level deterministically
        let riskLevel: 'low' | 'moderate' | 'elevated' | 'critical' = 'low';
        const absMove = Math.abs(triggerDetails.percentChange ?? quote?.percentChange ?? 0);

        if (portfolioContext?.positionWeight && portfolioContext.positionWeight >= 25 && absMove >= 3) {
            riskLevel = 'critical';
        } else if (absMove >= 5 || (portfolioContext?.positionWeight && portfolioContext.positionWeight >= 20)) {
            riskLevel = 'elevated';
        } else if (absMove >= 2.5) {
            riskLevel = 'moderate';
        }

        // 3. Formulate Prompt for Gemini AI
        const newsSummaryText = relevantNews && relevantNews.length > 0
            ? relevantNews.map((n) => `Headline: "${n.headline}" (Source: ${n.source})`).join('\n')
            : 'No breaking headlines reported within the last session.';

        const prompt = `
You are HyperStocks institutional financial intelligence engine.
Analyze this triggered market alert for ${symbol} (${companyProfile?.name || symbol}).

VERIFIED DATA (DO NOT ALTER OR INVENT ANY NUMBERS):
- Current Price: $${quote?.currentPrice ?? 'N/A'} (Change: ${quote?.percentChange ? quote.percentChange.toFixed(2) : '0'}%)
- Alert Category: ${alertType}
- S&P 500 Performance: ${marketContext?.sp500Change !== undefined ? marketContext.sp500Change.toFixed(2) + '%' : 'N/A'}
- NASDAQ Performance: ${marketContext?.nasdaqChange !== undefined ? marketContext.nasdaqChange.toFixed(2) + '%' : 'N/A'}
- Sector: ${marketContext?.sectorName || 'General Equity'}
- User Portfolio Exposure: ${isHeldInPortfolio ? `Holds position (Weight: ${portfolioContext?.positionWeight?.toFixed(1) || '0'}%)` : 'Not in portfolio'}
- Watchlist Status: ${isWatchlisted ? 'Monitored on watchlist' : 'Not watchlisted'}
- Recent News Context:
${newsSummaryText}

TASK:
Provide a concise, 2-3 sentence institutional market interpretation of this event.
RULES:
1. NEVER invent, extrapolate, or hallucinate prices, earnings, or percentages not provided above.
2. Explain what the move or trigger indicates regarding institutional flow, sector sentiment, or catalyst response.
3. If news is present, synthesize its connection to the move; if no news is present, explicitly state that the move reflects technical or order-flow dynamics without news catalysts.
4. Keep the tone rigorous, objective, and institutional. No hype, no guaranteed predictions.
`;

        try {
            const aiService = getAIService();
            const aiRes = await aiService.generateCompletion(
                prompt,
                'You are an institutional quantitative equity research director at HyperStocks. You deliver rigorous, factual financial briefing synthesis.'
            );

            if (aiRes.success && aiRes.data && aiRes.data.trim()) {
                const cleanAI = aiRes.data.trim();
                return {
                    aiSummary: cleanAI,
                    aiAnalysis: cleanAI,
                    whyItMatters,
                    riskLevel,
                };
            }
        } catch (err) {
            console.warn('[AlertAIInterpreter] Gemini synthesis failed, falling back to deterministic synthesis:', err);
        }

        // 4. Deterministic Fallback Synthesis (when AI service is offline or rate-limited)
        let fallbackAnalysis = `${symbol} triggered an automated ${alertType.replace('_', ' ')} alert at $${quote?.currentPrice?.toFixed(2) || 'N/A'}.`;
        if (triggerDetails.percentChange) {
            const dir = triggerDetails.percentChange >= 0 ? 'gains' : 'drawdowns';
            fallbackAnalysis += ` Intraday ${dir} of ${Math.abs(triggerDetails.percentChange).toFixed(2)}% outpaced benchmark session movement.`;
        }
        if (relevantNews && relevantNews.length > 0) {
            fallbackAnalysis += ` Recent market coverage focuses on: "${relevantNews[0].headline}".`;
        } else {
            fallbackAnalysis += ` Additional catalyst context is currently unavailable. Intraday price action reflects baseline order flow and liquidity dynamics.`;
        }

        return {
            aiSummary: fallbackAnalysis,
            aiAnalysis: fallbackAnalysis,
            whyItMatters,
            riskLevel,
        };
    }
}
