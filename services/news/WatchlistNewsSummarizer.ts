import { WatchlistArticle } from './WatchlistNewsService';
import { getAIService } from '@/services/ai';

export interface ArticleSummaryContent {
    whatHappened: string;
    whyItMatters: string;
    bottomLine: string;
    impact: 'positive' | 'negative' | 'mixed' | 'uncertain';
}

// In-memory cache across user batches in the same scheduled run
const summaryCache = new Map<string, ArticleSummaryContent>();

export class WatchlistNewsSummarizer {
    /**
     * Summarizes an article for the Watchlist news email.
     * Uses in-memory cache to prevent duplicate AI calls across users tracking the same ticker.
     * Gracefully falls back to high-fidelity deterministic synthesis if AI is unavailable or quota is exhausted.
     */
    static async summarizeArticle(
        article: WatchlistArticle,
        forceRefresh = false
    ): Promise<ArticleSummaryContent> {
        const cacheKey = article.id || article.url || article.headline;
        if (!forceRefresh && summaryCache.has(cacheKey)) {
            return summaryCache.get(cacheKey)!;
        }

        let summary: ArticleSummaryContent;

        try {
            const aiResult = await this.callGeminiSummarizer(article);
            if (aiResult) {
                summary = aiResult;
            } else {
                summary = this.generateFallbackSummary(article);
            }
        } catch (err) {
            console.warn(`[WatchlistNewsSummarizer] AI summarization failed for "${article.headline}". Using fallback.`, err);
            summary = this.generateFallbackSummary(article);
        }

        summaryCache.set(cacheKey, summary);
        return summary;
    }

    /**
     * Batch summarize articles with concurrency control
     */
    static async summarizeBatch(
        articles: WatchlistArticle[]
    ): Promise<WatchlistArticle[]> {
        const results: WatchlistArticle[] = [];

        for (const art of articles) {
            const summary = await this.summarizeArticle(art);
            results.push({
                ...art,
                whatHappened: summary.whatHappened,
                whyItMatters: summary.whyItMatters,
                bottomLine: summary.bottomLine,
                impact: summary.impact,
            });
        }

        return results;
    }

    /**
     * Direct Gemini call with structured JSON output instructions
     */
    private static async callGeminiSummarizer(
        article: WatchlistArticle
    ): Promise<ArticleSummaryContent | null> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return null;
        }

        const systemPrompt = `You are an elite, objective financial journalist and market analyst for HyperStocks.
Your task is to summarize verified financial news for investors tracking specific stocks.

CRITICAL RULES:
1. Summarize ONLY information directly supported by the provided headline, summary text, and company metadata.
2. DO NOT invent missing numbers, quarterly figures, quotes, executive names, or rumors.
3. DO NOT predict future stock price movements or give buy/sell recommendations.
4. Maintain a neutral, professional, evidence-based tone.
5. If the article contains limited information, state only what is known.
6. Return your response strictly as valid, raw JSON (no markdown formatting, no \`\`\`json code blocks) matching this schema:
{
  "whatHappened": "1 to 2 concise sentences describing the verified factual event.",
  "whyItMatters": "1 to 2 sentences explaining the direct operational, financial, or strategic impact on the tracked company.",
  "bottomLine": "1 sentence summarizing what investors should watch next and the key takeaway.",
  "impact": "positive" | "negative" | "mixed" | "uncertain"
}`;

        const userPrompt = `Analyze and summarize this verified news item for investors tracking: ${article.relatedSymbols.join(', ')} (${article.relatedCompanies.join(', ')})

Headline: ${article.headline}
Source: ${article.source}
Date: ${article.datetime ? new Date(article.datetime).toISOString().split('T')[0] : 'Recent'}
Article Description: ${article.summary || 'No further description available.'}
Article URL: ${article.url}`;

        const aiService = getAIService();
        const completionRes = await aiService.generateCompletion(userPrompt, systemPrompt);

        if (!completionRes.success || !completionRes.data) {
            return null;
        }

        const rawText = completionRes.data.trim();
        // Strip markdown fences if Gemini added them
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return null;
        }

        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (
                typeof parsed.whatHappened === 'string' &&
                typeof parsed.whyItMatters === 'string' &&
                typeof parsed.bottomLine === 'string'
            ) {
                const validImpacts = ['positive', 'negative', 'mixed', 'uncertain'];
                const impact = validImpacts.includes(parsed.impact)
                    ? (parsed.impact as ArticleSummaryContent['impact'])
                    : 'uncertain';

                return {
                    whatHappened: parsed.whatHappened.trim(),
                    whyItMatters: parsed.whyItMatters.trim(),
                    bottomLine: parsed.bottomLine.trim(),
                    impact,
                };
            }
        } catch {
            return null;
        }

        return null;
    }

    /**
     * Deterministic, high-fidelity fallback summary generator.
     * Uses headline, description, and catalyst analysis.
     * Guaranteed to work even when offline, quota exhausted, or API down.
     */
    public static generateFallbackSummary(
        article: WatchlistArticle
    ): ArticleSummaryContent {
        const text = `${article.headline} ${article.summary || ''}`.toLowerCase();
        const companies = article.relatedCompanies.length > 0
            ? article.relatedCompanies.join(' and ')
            : article.relatedSymbols.join(', ');

        // 1. Determine factual summary (What happened?)
        let whatHappened: string;
        if (article.summary && article.summary.length > 40 && !article.summary.toLowerCase().includes('click here')) {
            whatHappened = article.summary.trim();
            // Ensure ending period
            if (!/[.!?]$/.test(whatHappened)) whatHappened += '.';
        } else {
            whatHappened = `${article.headline.trim()}${/[.!?]$/.test(article.headline) ? '' : '.'}`;
        }

        // 2. Determine impact and why it matters based on catalysts
        let whyItMatters = `This development directly affects ${companies}'s operations and strategic market positioning.`;
        let bottomLine = `Investors will monitor subsequent regulatory filings and company updates for further clarity.`;
        let impact: ArticleSummaryContent['impact'] = 'uncertain';

        if (/\b(beats?|surpasses?|outperforms?|record profit|raises? guidance|raised? guidance|revenue beat|eps beat|tops? estimates|strong earnings|profit jumps?)\b/i.test(text) ||
            (/\b(earnings|revenue|profit|q[1-4]|quarterly)\b/i.test(text) && /\b(growth|surge|jump|record|higher|boost|up|beat)\b/i.test(text))) {
            impact = 'positive';
            whyItMatters = `Financial results and earnings indicators provide direct insight into ${companies}'s quarterly revenue trajectory and cash flow durability.`;
            bottomLine = `Watch upcoming margin metrics, guidance revisions, and executive management commentary during the earnings call.`;
        } else if (/\b(losses?|miss(es|ed)?|slashes? guidance|slashed? guidance|lowers? guidance|lowered? guidance|downgrades?|underperforms?|disappoints?|plunges?|drops?|falls?)\b/i.test(text) ||
                   (/\b(earnings|revenue|profit|q[1-4]|quarterly)\b/i.test(text) && /\b(miss|decline|drop|fall|lower|weak|down)\b/i.test(text))) {
            impact = 'negative';
            whyItMatters = `Subdued financial metrics or lowered outlooks may exert pressure on near-term valuation multiples and analyst consensus estimates for ${companies}.`;
            bottomLine = `Investors should track management cost-containment measures and next-quarter performance targets.`;
        } else if (/\b(acquisition|merger|buyout|deal|partnership|collaboration)\b/.test(text)) {
            impact = 'positive';
            whyItMatters = `Strategic transactions and partnerships can expand addressable markets, drive cross-selling synergies, or strengthen competitive moats for ${companies}.`;
            bottomLine = `Review transaction closing timelines, integration milestones, and regulatory approvals.`;
        } else if (/\b(lawsuit|sec|investigation|antitrust|subpoena|fine|penalty|patent dispute)\b/.test(text)) {
            impact = 'negative';
            whyItMatters = `Regulatory scrutiny and legal challenges carry financial liability risks and potential compliance or operational constraints for ${companies}.`;
            bottomLine = `Follow formal court filings, regulatory responses, and potential settlement discussions.`;
        } else if (/\b(fda|approval|clearance|clinical trial|phase [1-3])\b/.test(text)) {
            impact = text.includes('reject') || text.includes('fail') ? 'negative' : 'positive';
            whyItMatters = `Regulatory clinical milestones directly impact commercialization timelines and projected product pipelines for ${companies}.`;
            bottomLine = `Key factors to observe include commercial distribution rollout dates and competitive drug alternatives.`;
        } else if (/\b(unveil|launch|release|new chip|new model|breakthrough|ai)\b/.test(text)) {
            impact = 'positive';
            whyItMatters = `New product iterations and technological launches drive adoption cycles and support revenue expansion across ${companies}'s target segments.`;
            bottomLine = `Monitor initial customer adoption rates, product reviews, and early shipment volumes.`;
        } else if (/\b(resigns|steps down|fired|appoints|ceo|cfo|executive)\b/.test(text)) {
            impact = 'uncertain';
            whyItMatters = `Leadership transitions often precede shifts in capital allocation, operational strategy, and organizational focus for ${companies}.`;
            bottomLine = `Track incoming leadership statements regarding strategic priorities and organizational continuity.`;
        } else if (/\b(upgrade|price target raise|buy rating|outperform)\b/.test(text)) {
            impact = 'positive';
            whyItMatters = `Favorable analyst revisions reflect improving fundamentals or macro tailwinds benefiting ${companies}.`;
            bottomLine = `Assess whether peer institutions follow with similar sentiment adjustments.`;
        }

        return {
            whatHappened,
            whyItMatters,
            bottomLine,
            impact,
        };
    }

    /**
     * Clears the in-memory cache (useful for testing or starting a new scheduled batch)
     */
    public static clearCache(): void {
        summaryCache.clear();
    }
}
