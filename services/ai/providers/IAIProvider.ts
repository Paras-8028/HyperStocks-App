import { ApiResult } from '@/types/api';

export interface AIProviderMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

export interface AIProviderRequest {
    messages: AIProviderMessage[];
    systemInstruction?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

export interface AIProviderResponse {
    content: string;
    provider: string;
    model: string;
    finishReason?: string;
}

export interface IAIProvider {
    readonly name: string;
    readonly isAvailable: boolean;

    generateResponse(req: AIProviderRequest): Promise<ApiResult<AIProviderResponse>>;
    generateStream(req: AIProviderRequest): Promise<ReadableStream<Uint8Array>>;
}
