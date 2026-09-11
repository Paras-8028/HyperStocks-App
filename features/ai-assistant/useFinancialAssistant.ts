'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AIMessageProps } from './AIMessage';
import { ChatSession } from './AIConversationHistory';

export interface StoredThread {
    id: string;
    title: string;
    messages: AIMessageProps[];
    updatedAt: number;
}

const STORAGE_KEY = 'hyperstocks_ai_threads_v1';

export function useFinancialAssistant(initialSymbol?: string) {
    const [threads, setThreads] = useState<StoredThread[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>('default-session');
    const [messages, setMessages] = useState<AIMessageProps[]>([]);
    const [loading, setLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Initial load from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed: StoredThread[] = JSON.parse(raw);
                if (parsed.length > 0) {
                    setThreads(parsed);
                    setActiveSessionId(parsed[0].id);
                    setMessages(parsed[0].messages);
                    return;
                }
            }
        } catch {
            // Ignore parse errors
        }

        // Initialize default welcome session
        const defaultThread: StoredThread = {
            id: 'default-session',
            title: initialSymbol ? `${initialSymbol} Research` : 'Market Intelligence',
            updatedAt: Date.now(),
            messages: [
                {
                    role: 'assistant',
                    content: `Hello! I am your HyperStocks AI Financial Assistant. I can analyze real-time market data, compare stocks, evaluate your portfolio risk, and explain breaking market news.\n\nWhat would you like to explore today?`,
                    timestamp: Date.now(),
                },
            ],
        };
        setThreads([defaultThread]);
        setActiveSessionId(defaultThread.id);
        setMessages(defaultThread.messages);
    }, [initialSymbol]);

    // Save to localStorage whenever threads change
    const persistThreads = (updatedThreads: StoredThread[]) => {
        setThreads(updatedThreads);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedThreads));
        } catch (e) {
            console.error('Failed to save chat to localStorage:', e);
        }
    };

    // Switch session
    const selectSession = useCallback(
        (id: string) => {
            const found = threads.find((t) => t.id === id);
            if (found) {
                setActiveSessionId(id);
                setMessages(found.messages);
                setError(null);
            }
        },
        [threads]
    );

    // New chat
    const createNewChat = useCallback(() => {
        const newId = `session-${Date.now()}`;
        const newThread: StoredThread = {
            id: newId,
            title: 'New Financial Research',
            updatedAt: Date.now(),
            messages: [
                {
                    role: 'assistant',
                    content: 'Started a new research session. Ask me about any stock, portfolio breakdown, or market sector.',
                    timestamp: Date.now(),
                },
            ],
        };
        const updated = [newThread, ...threads];
        persistThreads(updated);
        setActiveSessionId(newId);
        setMessages(newThread.messages);
        setError(null);
    }, [threads]);

    // Delete chat
    const deleteSession = useCallback(
        (id: string) => {
            const remaining = threads.filter((t) => t.id !== id);
            persistThreads(remaining);
            if (activeSessionId === id && remaining.length > 0) {
                setActiveSessionId(remaining[0].id);
                setMessages(remaining[0].messages);
            }
        },
        [threads, activeSessionId]
    );

    // Stop streaming
    const stopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setIsStreaming(false);
    }, []);

    // Send message
    const sendMessage = useCallback(
        async (query: string, currentSymbol?: string) => {
            if (!query.trim() || loading) return;

            const userMessage: AIMessageProps = {
                role: 'user',
                content: query.trim(),
                timestamp: Date.now(),
            };

            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);
            setLoading(true);
            setIsStreaming(true);
            setError(null);

            const controller = new AbortController();
            abortControllerRef.current = controller;

            // Placeholder for assistant message streaming in
            const assistantMessageId = `asst-${Date.now()}`;
            const initialAssistantMsg: AIMessageProps = {
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                isStreaming: true,
            };

            setMessages((prev) => [...prev, initialAssistantMsg]);

            try {
                const res = await fetch('/api/ai/assistant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                        messages: updatedMessages.map((m) => ({
                            role: m.role,
                            content: m.content,
                        })),
                        currentSymbol,
                        stream: true,
                    }),
                });

                if (!res.ok) {
                    const errText = await res.text().catch(() => '');
                    throw new Error(errText || `Server error ${res.status}`);
                }

                // Handle SSE Stream
                const reader = res.body?.getReader();
                if (!reader) throw new Error('Response stream body unavailable');

                const decoder = new TextDecoder();
                let accumulatedText = '';
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('data: ')) {
                            const dataPayload = trimmed.slice(6);
                            try {
                                const parsed = JSON.parse(dataPayload);
                                if (parsed.text) {
                                    accumulatedText += parsed.text;
                                    setMessages((prev) => {
                                        const copy = [...prev];
                                        const lastIdx = copy.length - 1;
                                        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
                                            copy[lastIdx] = {
                                                ...copy[lastIdx],
                                                content: accumulatedText,
                                                isStreaming: true,
                                            };
                                        }
                                        return copy;
                                    });
                                }
                            } catch {
                                // Ignore non-json lines
                            }
                        }
                    }
                }

                // Mark streaming complete
                const finalAssistantMsg: AIMessageProps = {
                    role: 'assistant',
                    content: accumulatedText || 'I processed your query.',
                    timestamp: Date.now(),
                    isStreaming: false,
                };

                const finalMessages = [...updatedMessages, finalAssistantMsg];
                setMessages(finalMessages);

                // Update thread title and messages in stored state
                setThreads((prevThreads) => {
                    const next = prevThreads.map((t) => {
                        if (t.id === activeSessionId) {
                            const newTitle =
                                t.title === 'New Financial Research' || t.title === 'Market Intelligence'
                                    ? query.slice(0, 32)
                                    : t.title;
                            return {
                                ...t,
                                title: newTitle,
                                messages: finalMessages,
                                updatedAt: Date.now(),
                            };
                        }
                        return t;
                    });
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                    } catch {}
                    return next;
                });
            } catch (err: any) {
                if (err?.name === 'AbortError') {
                    // User aborted stream
                    return;
                }
                console.error('AI assistant error:', err);
                setError(err?.message || 'Failed to complete query');
                setMessages((prev) => [
                    ...prev.filter((m) => m.content !== ''),
                    {
                        role: 'assistant',
                        content: `⚠️ I encountered an issue retrieving real-time data for this query: ${err?.message || 'Connection error'}. Please verify your API key or try again shortly.`,
                        timestamp: Date.now(),
                    },
                ]);
            } finally {
                setLoading(false);
                setIsStreaming(false);
                abortControllerRef.current = null;
            }
        },
        [messages, loading, activeSessionId]
    );

    const sessions: ChatSession[] = threads.map((t) => ({
        id: t.id,
        title: t.title,
        updatedAt: t.updatedAt,
        messageCount: t.messages.length,
    }));

    return {
        messages,
        sessions,
        activeSessionId,
        loading,
        isStreaming,
        error,
        sendMessage,
        stopGeneration,
        selectSession,
        createNewChat,
        deleteSession,
    };
}
