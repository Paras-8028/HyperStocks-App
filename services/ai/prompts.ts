export const STOCK_THESIS_PROMPT = (
    symbol: string,
    companyName: string,
    quoteData: string,
    metricsData: string,
    userProfile: string
) => `
You are a senior equity research analyst at HyperStocks. Provide an institutional-grade investment thesis for ${symbol} (${companyName}).
Current Market Data:
${quoteData}

Key Financial Ratios & Metrics:
${metricsData}

User Profile & Constraints:
${userProfile}

CRITICAL: Return ONLY valid, raw JSON with NO markdown formatting, NO triple backticks, and NO extraneous text.
JSON Structure:
{
  "symbol": "${symbol}",
  "companyName": "${companyName}",
  "verdict": "strong_buy" | "buy" | "hold" | "underweight" | "sell",
  "confidenceScore": 82, // integer between 0 and 100
  "summary": "2-3 concise sentences summarizing the investment proposition",
  "bullCase": ["key point 1", "key point 2", "key point 3"],
  "bearCase": ["key risk 1", "key risk 2", "key risk 3"],
  "catalysts": ["upcoming catalyst 1", "upcoming catalyst 2"],
  "risks": ["fundamental risk 1", "macro risk 2"],
  "valuationAssessment": "Assessment of current multiple relative to growth",
  "disclaimer": "Informational research only. Not personalized financial advice. Past performance is no guarantee of future returns.",
  "generatedAt": "${new Date().toISOString()}"
}
`;

export const NEWS_SENTIMENT_PROMPT = (newsJson: string) => `
Analyze the market sentiment and financial impact of the following stock news articles.
Articles Data:
${newsJson}

CRITICAL: Return ONLY valid, raw JSON with NO markdown formatting and NO code block fences.
JSON Structure:
[
  {
    "articleId": 123,
    "headline": "headline text",
    "sentimentScore": 0.65, // float from -1.0 (extremely bearish) to +1.0 (extremely bullish)
    "label": "bullish" | "bearish" | "neutral",
    "keyTakeaway": "One sentence explaining why this matters to investors",
    "affectedSymbols": ["AAPL", "MSFT"]
  }
]
`;

export const PORTFOLIO_AUDIT_PROMPT = (
    portfolioJson: string,
    userProfile: string
) => `
You are a quantitative portfolio risk officer. Audit this user's investment portfolio:
Holdings:
${portfolioJson}

User Risk Profile & Objectives:
${userProfile}

CRITICAL: Return ONLY valid, raw JSON with NO markdown formatting.
JSON Structure:
{
  "overallRiskScore": 6.5, // 1 to 10
  "diversificationScore": 7.0, // 1 to 10
  "alignmentWithProfile": "aligned" | "too_aggressive" | "too_conservative",
  "concentrationRisks": ["Risk point 1", "Risk point 2"],
  "sectorExposureWarnings": ["Sector warning 1"],
  "actionableSuggestions": ["Rebalancing action 1", "Hedging suggestion 2"],
  "summary": "Concise summary paragraph of portfolio health"
}
`;

export const MARKET_BRIEFING_PROMPT = (
    watchlistSymbols: string[],
    userProfile: string
) => `
Generate a personalized morning market briefing for a HyperStocks user.
Watchlist: ${watchlistSymbols.join(', ') || 'General S&P 500 / NASDAQ'}
User Profile:
${userProfile}

CRITICAL: Return ONLY valid, raw JSON with NO markdown formatting.
JSON Structure:
{
  "date": "${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}",
  "headline": "Punchy 6-10 word market snapshot",
  "marketTone": "bullish" | "bearish" | "cautious" | "mixed",
  "personalizedInsights": [
    "Tailored observation 1 related to user's industry and risk preference",
    "Tailored observation 2"
  ],
  "watchlistHighlights": [
    {
      "symbol": "AAPL",
      "insight": "Specific key setup or news context",
      "signal": "positive" | "negative" | "neutral"
    }
  ],
  "macroFocus": "1-2 sentences on interest rates, inflation, or earnings season pulse"
}
`;

export const COPILOT_SYSTEM_PROMPT = `
You are HyperStocks AI Copilot, a helpful, analytical stock market assistant.
You answer investor queries with precise financial reasoning, real market quotes provided in context, and clear risk caveats.
Keep answers concise, scannable, and highlight metrics in bold. 
Always include a brief disclaimer that you provide financial information, not certified investment advice.
`;
