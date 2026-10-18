'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialAssistant } from './useFinancialAssistant';
import { AIMessage } from './AIMessage';
import { AIInput } from './AIInput';
import { SuggestedPrompts } from './SuggestedPrompts';
import { AIConversationHistory } from './AIConversationHistory';
import {
    ArrowLeft,
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
    const router = useRouter();

    const handleBack = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (mode === 'drawer') {
            setIsOpen(false);
            return;
        }

        if (typeof window !== 'undefined') {
            const hasHistory =
                (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) ||
                (window.history.length > 1 &&
                    document.referrer &&
                    document.referrer.startsWith(window.location.origin) &&
                    document.referrer !== window.location.href);

            if (hasHistory) {
                router.back();
            } else {
                router.push('/overview');
            }
        } else {
            router.push('/overview');
        }
    };

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
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const isUserNearBottomRef = useRef(true);

    const handleScroll = () => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        isUserNearBottomRef.current = distanceFromBottom < 100;
    };

    // Auto-scroll to bottom of messages only when user is already near bottom
    useEffect(() => {
        if (isUserNearBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isStreaming]);

    // Global listener to open assistant from navbar or other triggers
    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-ai-assistant', handleOpen);
        return () => window.removeEventListener('open-ai-assistant', handleOpen);
    }, []);

    const handleSubmit = () => {
        if (!input.trim() || loading) return;
        isUserNearBottomRef.current = true;
        sendMessage(input, currentSymbol);
        setInput('');
    };

    const handleSelectPrompt = (prompt: string) => {
        isUserNearBottomRef.current = true;
        sendMessage(prompt, currentSymbol);
    };

    if (mode === 'drawer' && !isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] px-5 py-3.5 text-xs font-bold text-[#050816] shadow-[0_0_25px_rgba(124,92,255,0.4)] hover:brightness-110 transition-all hover:scale-105 group"
                id="open-ai-assistant-btn"
            >
                <div className="relative flex items-center justify-center h-5 w-5">
                    {/* Rotating rings */}
                    <span className="absolute inset-0 rounded-full border border-[#050816] border-dashed animate-orbital-spin" />
                    <Sparkles className="h-3.5 w-3.5 text-[#050816]" />
                </div>
                <span className="tracking-wide">AI ASSISTANT</span>
                {currentSymbol && (
                    <span className="rounded-full bg-[#050816]/20 px-2 py-0.5 text-[10px] font-mono font-bold">
                        ${currentSymbol}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div
            className={`flex flex-col rounded-2xl sm:rounded-3xl border border-[#7C5CFF]/35 bg-[#0D1424]/95 backdrop-blur-2xl shadow-[0_0_40px_rgba(124,92,255,0.18)] overflow-hidden transition-all duration-300 min-h-0 ${
                mode === 'drawer'
                    ? `fixed bottom-6 right-6 z-50 ${
                          isExpanded
                              ? 'w-[750px] h-[750px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-3rem)]'
                              : 'w-[440px] h-[600px] max-w-[calc(100vw-2rem)]'
                      }`
                    : 'w-full h-full flex-1'
            } ${className}`}
        >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.14)] px-3 sm:px-4 py-2 sm:py-2.5 bg-[#080D1B]/95 shrink-0">
                <div className="flex items-center gap-2 sm:gap-2.5">
                    {/* Back Button */}
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E] border border-[rgba(148,163,184,0.16)] hover:border-[#7C5CFF]/50 transition-all duration-200 group focus:outline-none"
                        aria-label="Back"
                        title="Back to previous page"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-[#35D6FF]" />
                        <span className="hidden sm:inline">Back</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-1.5 rounded-xl transition ${
                            showHistory
                                ? 'bg-[#7C5CFF]/20 text-[#35D6FF]'
                                : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E]'
                        }`}
                        title="Toggle conversation threads"
                        aria-label="Toggle conversation threads"
                    >
                        <History className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C5CFF]/20 to-[#35D6FF]/20 border border-[#7C5CFF]/40 text-[#35D6FF]">
                            <span className="absolute inset-0 rounded-xl border border-[#35D6FF]/30 animate-pulse" />
                            <Sparkles className="h-3.5 w-3.5 text-[#35D6FF]" />
                        </div>
                        <div>
                            <h1 className="text-xs sm:text-sm font-bold text-[#F4F7FF] flex items-center gap-1.5 leading-tight">
                                AI Financial Assistant
                                <span className="text-[10px] font-mono font-normal text-[#35D6FF] px-1.5 py-0.5 rounded bg-[#35D6FF]/10 border border-[#35D6FF]/20">
                                    Gemini 2.5
                                </span>
                            </h1>
                            <div className="text-[10px] sm:text-[11px] text-[#94A3B8] flex items-center gap-1.5 leading-tight">
                                <span className={`flex h-1.5 w-1.5 rounded-full ${loading ? 'bg-[#35D6FF] animate-ping' : 'bg-[#3DFFA0]'}`} />
                                <span className="truncate max-w-[200px] sm:max-w-none">
                                    {loading
                                        ? 'Analyzing Financial Telemetry...'
                                        : currentSymbol
                                        ? `Context: $${currentSymbol} & Watchlist`
                                        : 'AI Financial Intelligence Ready'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {mode === 'drawer' && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 text-[#94A3B8] hover:text-[#F4F7FF] rounded-lg hover:bg-[#111B2E] transition"
                            title={isExpanded ? 'Restore size' : 'Expand window'}
                        >
                            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </button>
                    )}

                    {mode === 'drawer' && (
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 text-[#94A3B8] hover:text-[#F4F7FF] rounded-lg hover:bg-[#111B2E] transition"
                            title="Close AI Telescope"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main content body */}
            <div className="flex flex-1 overflow-hidden relative min-h-0">
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
                <div className="flex flex-col flex-1 overflow-hidden px-3 sm:px-4 py-2.5 sm:py-3 space-y-2.5 min-h-0">
                    <div
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 pr-1.5 min-h-0"
                    >
                        {messages.map((msg, idx) => (
                            <AIMessage
                                key={idx}
                                role={msg.role}
                                content={msg.content}
                                timestamp={msg.timestamp}
                                model={msg.model}
                                isStreaming={msg.isStreaming}
                                isError={msg.isError}
                                errorDetails={msg.errorDetails}
                                onRetry={msg.onRetry}
                            />
                        ))}

                        {/* Suggested prompt pills on fresh sessions */}
                        {messages.length <= 1 && (
                            <div className="pt-1.5">
                                <SuggestedPrompts
                                    onSelectPrompt={handleSelectPrompt}
                                    currentSymbol={currentSymbol}
                                />
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="pt-2 border-t border-[rgba(148,163,184,0.12)] shrink-0">
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
