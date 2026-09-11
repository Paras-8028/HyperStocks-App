export const AI_CONFIG = {
    provider: 'gemini' as const,
    defaultModel: 'gemini-3.6-flash',
    fallbackModel: 'gemini-flash-latest',
    temperature: 0.2, // Low temperature for factual, analytical consistency
    maxTokens: 4096,
    timeoutMs: 25000,
    systemInstruction: `You are HyperStocks AI, an institutional-grade stock intelligence copilot and financial analyst. 
Your objective is to provide objective, data-grounded equity analysis, risk assessments, thesis generation, and catalyst tracking. 
Always remain neutral, transparent, and adhere to regulatory standards by including an appropriate financial disclaimer. Never provide speculative financial advice as guaranteed facts.`,
} as const;

export type AIConfig = typeof AI_CONFIG;
