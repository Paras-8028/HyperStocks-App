export const AI_CONFIG = {
    provider: 'gemini' as const,
    defaultModel: 'gemini-2.5-flash-lite',
    fallbackModel: 'gemini-3.5-flash',
    candidateModels: [
        'gemini-2.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.7-flash',
        'gemini-flash-latest',
    ],
    temperature: 0.2, // Low temperature for factual, analytical consistency
    maxTokens: 4096,
    timeoutMs: 25000,
    systemInstruction: `You are HyperStocks AI, an institutional-grade stock intelligence copilot and financial analyst. 
Your objective is to provide objective, data-grounded equity analysis, risk assessments, thesis generation, and catalyst tracking. 
Always remain neutral, transparent, and adhere to regulatory standards by including an appropriate financial disclaimer. Never provide speculative financial advice as guaranteed facts.`,
} as const;

export type AIConfig = typeof AI_CONFIG;
