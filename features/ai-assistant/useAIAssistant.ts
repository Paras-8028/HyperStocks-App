'use client';

import { useState, useCallback } from 'react';
import { CopilotContext, CopilotMessage } from '@/types/ai';

export function useAIAssistant(initialContext?: CopilotContext) {
    const [messages, setMessages] = useState<CopilotMessage[]>([
        {
            id: 'welcome-msg',
            role: 'assistant',
            content: 'Hello! I am your HyperStocks AI Copilot. Ask me about stock catalysts, valuation comparisons, earnings analysis, or your watchlist.',
            timestamp: Date.now(),
            suggestedFollowUps: [
                'What are the key catalysts for this stock?',
                'How does current valuation compare to historical?',
                'Audit risk on my watchlist',
            ],
        },
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(
        async (content: string, context?: CopilotContext) => {
            if (!content.trim()) return;

            const userMsg: CopilotMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: content.trim(),
                timestamp: Date.now(),
            };

            const updatedMessages = [...messages, userMsg];
            setMessages(updatedMessages);
            setLoading(true);
            setError(null);

            try {
                const res = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: updatedMessages,
                        context: context || initialContext,
                    }),
                });

                if (!res.ok) {
                    const errorText = await res.text().catch(() => '');
                    throw new Error(errorText || `API error ${res.status}`);
                }

                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.error || 'Failed to get AI response');
                }

                setMessages((prev) => [...prev, data.data]);
            } catch (err: any) {
                console.error('useAIAssistant error:', err);
                setError(err?.message || 'Failed to communicate with AI Copilot');
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `error-${Date.now()}`,
                        role: 'assistant',
                        content: '⚠️ I encountered an issue analyzing the market data. Please verify your GEMINI_API_KEY or try again shortly.',
                        timestamp: Date.now(),
                    },
                ]);
            } finally {
                setLoading(false);
            }
        },
        [messages, initialContext]
    );

    const clearHistory = useCallback(() => {
        setMessages([
            {
                id: 'welcome-msg-reset',
                role: 'assistant',
                content: 'Chat history cleared. How can I assist your investment research today?',
                timestamp: Date.now(),
            },
        ]);
        setError(null);
    }, []);

    return {
        messages,
        loading,
        error,
        sendMessage,
        clearHistory,
    };
}
