'use client';

import React, { useState } from 'react';
import { Bot, Check, Copy, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export interface AIMessageProps {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
    model?: string;
    isStreaming?: boolean;
}

export function AIMessage({
    role,
    content,
    timestamp,
    model,
    isStreaming = false,
}: AIMessageProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            toast.success('Response copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };

    const isUser = role === 'user';

    // Simple markdown renderer for bold text, bullet points, headers, and ticker links
    const renderFormattedContent = (text: string) => {
        const lines = text.split('\n');

        return lines.map((line, idx) => {
            // Check for markdown table row
            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                const cells = line
                    .split('|')
                    .slice(1, -1)
                    .map((c) => c.trim());
                if (cells.every((c) => c.includes('---'))) {
                    return null; // Divider row
                }
                return (
                    <div
                        key={idx}
                        className="grid grid-flow-col auto-cols-fr gap-2 py-1 px-2 border-b border-gray-850 text-[11px] font-mono"
                    >
                        {cells.map((cell, cIdx) => (
                            <span key={cIdx} className={idx === 0 ? 'font-bold text-gray-200' : 'text-gray-300'}>
                                {cell}
                            </span>
                        ))}
                    </div>
                );
            }

            // Headers
            if (line.startsWith('### ')) {
                return (
                    <h5 key={idx} className="text-xs font-bold text-emerald-400 mt-2.5 mb-1">
                        {line.replace('### ', '')}
                    </h5>
                );
            }
            if (line.startsWith('## ')) {
                return (
                    <h4 key={idx} className="text-sm font-bold text-gray-100 mt-3 mb-1">
                        {line.replace('## ', '')}
                    </h4>
                );
            }

            // Bullet points
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const bulletText = line.trim().substring(2);
                return (
                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-200 my-0.5 leading-relaxed">
                        <span className="text-emerald-400 font-bold shrink-0">•</span>
                        <span>{formatInlineText(bulletText)}</span>
                    </div>
                );
            }

            // Empty line spacer
            if (!line.trim()) {
                return <div key={idx} className="h-1.5" />;
            }

            // Standard paragraph
            return (
                <p key={idx} className="text-xs text-gray-200 leading-relaxed my-0.5">
                    {formatInlineText(line)}
                </p>
            );
        });
    };

    // Formats inline bold text (**bold**) and ticker symbols ($AAPL)
    const formatInlineText = (str: string) => {
        const parts = str.split(/(\*\*.*?\*\*|\$[A-Z]{1,5}\b|\b[A-Z]{2,5}\b)/g);

        return parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <strong key={pIdx} className="font-semibold text-gray-100">
                        {part.slice(2, -2)}
                    </strong>
                );
            }

            // Ticker symbol highlighted with link
            const isTicker =
                part.startsWith('$') ||
                ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'AMD', 'SPY', 'QQQ', 'UBER', 'LLY'].includes(
                    part
                );

            if (isTicker) {
                const clean = part.replace('$', '');
                return (
                    <Link
                        key={pIdx}
                        href={`/stocks/${clean}`}
                        className="inline-flex items-center text-emerald-400 font-bold hover:underline hover:text-emerald-300 mx-0.5"
                    >
                        ${clean}
                    </Link>
                );
            }

            return part;
        });
    };

    return (
        <div
            className={`flex gap-3 text-xs leading-relaxed ${
                isUser ? 'justify-end' : 'justify-start'
            }`}
        >
            {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm mt-0.5">
                    <Bot className="h-4 w-4" />
                </div>
            )}

            <div
                className={`relative group max-w-[85%] rounded-2xl p-4 space-y-2 backdrop-blur shadow-md ${
                    isUser
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-gray-900/90 text-gray-200 border border-gray-800 rounded-tl-none'
                }`}
            >
                {/* Header for assistant message */}
                {!isUser && (
                    <div className="flex items-center justify-between border-b border-gray-800/80 pb-2 text-[11px] text-gray-400">
                        <div className="flex items-center gap-1.5 font-medium">
                            <span className="text-gray-200 font-semibold">HyperStocks Assistant</span>
                            {model && <span className="text-[10px] text-gray-500">({model})</span>}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={handleCopy}
                                className="p-1 text-gray-400 hover:text-gray-200 rounded"
                                title="Copy response"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Message body */}
                <div className="space-y-1">
                    {renderFormattedContent(content)}
                    {isStreaming && (
                        <span className="inline-block h-3.5 w-1.5 bg-emerald-400 animate-pulse ml-1" />
                    )}
                </div>

                {/* Timestamp */}
                {timestamp && (
                    <div className={`text-[10px] pt-1 text-right ${isUser ? 'text-emerald-100/70' : 'text-gray-500'}`}>
                        {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>

            {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-800 border border-gray-700 text-gray-300 mt-0.5">
                    <User className="h-4 w-4" />
                </div>
            )}
        </div>
    );
}
