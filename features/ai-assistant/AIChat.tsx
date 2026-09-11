'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFinancialAssistant } from './useFinancialAssistant';
import { AIMessage } from './AIMessage';
import { AIInput } from './AIInput';
import { SuggestedPrompts } from './SuggestedPrompts';
import { AIConversationHistory } from './AIConversationHistory';
import {
    Bot,
    ChevronLeft,
    ChevronRight,
    History,
    Maximize2,
    Minimize2,
    Sparkles,
    X,
} from 'lucide-react';

export interface AIChatProps {
    currentSymbol?: string;
    mode?: 'embedded' | 'drawer';
    defaultOpen?: boolean;
    className?: string;
}

export function AIChat({
    currentSymbol,
    mode = 'drawer',
    defaultOpen = false,
    className = '',
}: AIChatProps) {
    const [isOpen, setIsOpen] = useState(mode === 'embedded' || defaultOpen);
    const [showHistory, setShowHistory] = useState(false);
    const [input, setInput] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const {
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
    } = useFinancialAssistant(currentSymbol);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    const handleSubmit = () => {
        if (!input.trim() || loading) return;
        sendMessage(input, currentSymbol);
        setInput('');
    };

    const handleSelectPrompt = (prompt: string) => {
        sendMessage(prompt, currentSymbol);
    };

    if (mode === 'drawer' && !isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-emerald-500 px-5 py-3.5 text-sm font-bold text-gray-950 shadow-2xl shadow-emerald-500/30 hover:bg-emerald-400 transition-all hover:scale-105 group"
                id="open-ai-assistant-btn"
            >
                <div className="relative">
                    <Bot className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-950 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-950" />
                    </span>
                </div>
                <span>AI Assistant</span>
                {currentSymbol && (
                    <span className="rounded-full bg-gray-950/20 px-2 py-0.5 text-xs font-mono font-bold">
                        ${currentSymbol}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div
            className={`flex flex-col rounded-3xl border border-gray-800 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 ${
                mode === 'drawer'
                    ? `fixed bottom-6 right-6 z-50 ${
                          isExpanded
                              ? 'w-[750px] h-[750px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-3rem)]'
                              : 'w-[440px] h-[600px] max-w-[calc(100vw-2rem)]'
                      }`
                    : 'w-full h-[680px]'
            } ${className}`}
        >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-gray-800/80 px-4 py-3.5 bg-gray-900/90">
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-1.5 rounded-xl transition ${
                            showHistory
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }`}
                        title="Toggle conversation threads"
                    >
                        <History className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                                HyperStocks Financial Assistant
                                <Sparkles className="h-3 w-3 text-emerald-400" />
                            </h3>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                {currentSymbol ? `Context: ${currentSymbol} & Watchlist` : 'Market-Grounded Engine'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {mode === 'drawer' && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition"
                            title={isExpanded ? 'Restore size' : 'Expand window'}
                        >
                            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </button>
                    )}

                    {mode === 'drawer' && (
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition"
                            title="Close assistant"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main content body */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Conversation History Drawer */}
                {showHistory && (
                    <div className="absolute inset-y-0 left-0 z-20 w-64 shadow-2xl animate-in slide-in-from-left duration-200">
                        <AIConversationHistory
                            sessions={sessions}
                            currentSessionId={activeSessionId}
                            onSelectSession={(id) => {
                                selectSession(id);
                                setShowHistory(false);
                            }}
                            onNewChat={() => {
                                createNewChat();
                                setShowHistory(false);
                            }}
                            onDeleteSession={deleteSession}
                        />
                    </div>
                )}

                {/* Messages view */}
                <div className="flex flex-col flex-1 overflow-hidden p-4 space-y-4">
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {messages.map((msg, idx) => (
                            <AIMessage
                                key={idx}
                                role={msg.role}
                                content={msg.content}
                                timestamp={msg.timestamp}
                                model={msg.model}
                                isStreaming={msg.isStreaming}
                            />
                        ))}

                        {/* Suggested prompt pills on fresh sessions */}
                        {messages.length <= 1 && (
                            <div className="pt-2">
                                <SuggestedPrompts
                                    onSelectPrompt={handleSelectPrompt}
                                    currentSymbol={currentSymbol}
                                />
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="pt-2 border-t border-gray-800/80">
                        <AIInput
                            value={input}
                            onChange={setInput}
                            onSubmit={handleSubmit}
                            onStop={stopGeneration}
                            loading={loading}
                            placeholder={
                                currentSymbol
                                    ? `Ask about ${currentSymbol} catalysts, risks, or valuation...`
                                    : 'Ask about any stock, portfolio risk, or market news...'
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
