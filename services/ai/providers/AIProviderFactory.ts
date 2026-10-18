import { IAIProvider } from './IAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { OpenAIProvider } from './OpenAIProvider';

export class AIProviderFactory {
    private static cachedProvider: IAIProvider | null = null;

    static getProvider(): IAIProvider {
        const providerName = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();

        if (this.cachedProvider && this.cachedProvider.name.toLowerCase().includes(providerName)) {
            return this.cachedProvider;
        }

        switch (providerName) {
            case 'openai':
                this.cachedProvider = new OpenAIProvider();
                break;
            case 'gemini':
            default:
                this.cachedProvider = new GeminiProvider();
                break;
        }

        return this.cachedProvider;
    }

    static getAvailableProviders(): string[] {
        const list: string[] = [];
        if (process.env.GEMINI_API_KEY) list.push('gemini');
        if (process.env.OPENAI_API_KEY) list.push('openai');
        return list;
    }
}
