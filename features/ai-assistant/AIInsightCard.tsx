'use client';

import React from 'react';
import { ArrowUpRight, Bot, Sparkles, TrendingUp } from 'lucide-react';

export interface AIInsightCardProps {
    title: string;
    description: string;
    symbol?: string;
    metric?: string;
    onAskFollowUp?: (query: string) => void;
    className?: string;
}

export function AIInsightCard({
    title,
    description,
    symbol,
    metric,
    onAskFollowUp,
    className = '',
}: AIInsightCardProps) {
    const followUpQuery = symbol
        ? `What are the key drivers and catalysts behind ${symbol}?`
        : `Tell me more about ${title}`;

    return (
        <div
            className={`group rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-gray-900 via-gray-900/90 to-emerald-950/15 p-5 backdrop-blur shadow-lg space-y-3 hover:border-emerald-500/40 transition ${className}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <Bot className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-200">{title}</span>
                </div>

                {metric && (
                    <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {metric}
                    </span>
                )}
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
                {description}
            </p>

            {onAskFollowUp && (
                <div className="pt-2 border-t border-gray-800/80 flex justify-end">
                    <button
                        onClick={() => onAskFollowUp(followUpQuery)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition"
                    >
                        Ask Assistant <ArrowUpRight className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}
