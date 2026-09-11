import { GeminiAIService } from './GeminiAIService';
import { IAIIntelligenceService } from './IAIIntelligenceService';

let aiServiceInstance: IAIIntelligenceService | null = null;

export function getAIService(): IAIIntelligenceService {
    if (!aiServiceInstance) {
        aiServiceInstance = new GeminiAIService();
    }
    return aiServiceInstance;
}

export * from './IAIIntelligenceService';
export * from './GeminiAIService';
export * from './prompts';
