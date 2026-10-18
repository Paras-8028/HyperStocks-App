'use client';

import { useState, useCallback, useRef } from 'react';
import { CopilotContext, CopilotMessage } from '@/types/ai';

export function useAIAssistant(initialContext?: CopilotContext) {
    const [messages, setMessages] = useState<CopilotMessage[]>(() => [
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
    const isSendingRef = useRef(false);

    const sendMessage = useCallback(
        async (content: string, context?: CopilotContext) => {
            if (!content.trim() || loading || isSendingRef.current) return;
            isSendingRef.current = true;

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

            const cleanHistory = updatedMessages.filter((m) => !m.id.startsWith('error-'));

            try {
                const res = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: cleanHistory,
                        context: context || initialContext,
                    }),
                });

                const data = await res.json().catch(() => null);

                if (!res.ok || !data?.success) {
                    const message =
                        data?.error?.message ||
                        (typeof data?.error === 'string' ? data.error : null) ||
                        (res.status === 429
                            ? 'AI analysis quota reached. Please try again later.'
                            : res.status === 503
                            ? 'AI service is temporarily busy. Please try again in a few moments.'
                            : 'AI Copilot encountered an error');
                    setError(message);
                    setMessages((prev) => [
                        ...prev.filter((m) => !m.id.startsWith('error-')),
                        {
                            id: `error-${Date.now()}`,
                            role: 'assistant',
                            content: `⚠️ ${message}`,
                            timestamp: Date.now(),
                        },
                    ]);
                    return;
                }

                setMessages((prev) => [...prev.filter((m) => !m.id.startsWith('error-')), data.data]);
            } catch {
                const fallback = 'Failed to communicate with AI Copilot. Please check your network connection.';
                setError(fallback);
                setMessages((prev) => [
                    ...prev.filter((m) => !m.id.startsWith('error-')),
                    {
                        id: `error-${Date.now()}`,
                        role: 'assistant',
                        content: `⚠️ ${fallback}`,
                        timestamp: Date.now(),
                    },
                ]);
            } finally {
                setLoading(false);
                isSendingRef.current = false;
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
