export const AI_CONFIG = {
    provider: 'gemini' as const,
    defaultModel: 'gemini-2.5-flash',
    fallbackModel: 'gemini-1.5-flash',
    temperature: 0.2, // Low temperature for factual, analytical consistency
    maxTokens: 2048,
    timeoutMs: 15000,
    systemInstruction: `You are HyperStocks AI, an institutional-grade stock intelligence copilot and financial analyst. 
Your objective is to provide objective, data-grounded equity analysis, risk assessments, thesis generation, and catalyst tracking. 
Always remain neutral, transparent, and adhere to regulatory standards by including an appropriate financial disclaimer. Never provide speculative financial advice as guaranteed facts.`,
} as const;

export type AIConfig = typeof AI_CONFIG;
