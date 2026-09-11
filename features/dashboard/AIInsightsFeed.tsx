'use client';

import React from 'react';
import { AIInsightFeedItem } from '@/types/ai';
import {
    Activity,
    ArrowUpRight,
    BarChart2,
    Clock,
    Flame,
    Radio,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export function AIInsightsFeed({ className = '' }: { className?: string }) {
    const feedItems: AIInsightFeedItem[] = [
        {
            id: 'feed-1',
            category: 'volume',
            content: 'Apple (AAPL) trading volume is 45% above its 30-day moving average on institutional buying.',
            relatedSymbol: 'AAPL',
            timeAgo: '8m ago',
        },
        {
            id: 'feed-2',
            category: 'sentiment',
            content: 'Technology sector sentiment score improved significantly (+0.78) following resilient datacenter cloud capex reports.',
            timeAgo: '19m ago',
        },
        {
            id: 'feed-3',
            category: 'technical',
            content: 'The S&P 500 (SPY) is testing its upper ascending channel resistance line with constructive market breadth.',
            relatedSymbol: 'SPY',
            timeAgo: '35m ago',
        },
        {
            id: 'feed-4',
            category: 'volume',
            content: 'Semiconductor ETF (SMH) block buy order detected in dark pools at $248.50 level.',
            relatedSymbol: 'NVDA',
            timeAgo: '52m ago',
        },
        {
            id: 'feed-5',
            category: 'macro',
            content: 'US 2-Year / 10-Year Treasury Yield curve gap narrowed by 6 basis points following retail sales data.',
            timeAgo: '1h ago',
        },
        {
            id: 'feed-6',
            category: 'technical',
            content: 'Microsoft (MSFT) 14-day RSI reset from overbought (72) back to neutral (54), forming an orderly bull flag.',
            relatedSymbol: 'MSFT',
            timeAgo: '2h ago',
        },
    ];

    const categoryBadges: Record<AIInsightFeedItem['category'], { label: string; text: string; bg: string }> = {
        volume: { label: 'Volume Alert', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
        sentiment: { label: 'Sentiment Pulse', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
        technical: { label: 'Technical Signal', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
        macro: { label: 'Macro Shift', text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
                        AI Insights Live Feed
                    </h2>
                    <p className="text-xs text-gray-400">
                        Algorithmic micro-signals streaming as anomalies and technical triggers occur across the market
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur divide-y divide-gray-800/80 shadow-lg overflow-hidden">
                {feedItems.map((item) => {
                    const badge = categoryBadges[item.category] || categoryBadges.technical;

                    return (
                        <div
                            key={item.id}
                            className="p-4 hover:bg-gray-850/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-400 border border-gray-750">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                                        >
                                            {badge.label}
                                        </span>
                                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {item.timeAgo}
                                        </span>
                                    </div>
                                    <p className="text-gray-200 leading-snug font-normal">
                                        {item.content}
                                    </p>
                                </div>
                            </div>

                            {item.relatedSymbol && (
                                <Link
                                    href={`/stocks/${item.relatedSymbol}`}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 self-end sm:self-center shrink-0 px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700/80 hover:border-emerald-500/40 transition"
                                >
                                    ${item.relatedSymbol} <ArrowUpRight className="h-3 w-3" />
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
