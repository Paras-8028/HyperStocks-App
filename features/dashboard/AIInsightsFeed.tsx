'use client';

import React, { useState, useEffect } from 'react';
import { usePersonalization } from '@/context/PersonalizationContext';
import { ScoredInsight } from '@/types/personalization';
import {
    Activity,
    ArrowUpRight,
    BarChart2,
    Clock,
    Flame,
    Radio,
    Shield,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export function AIInsightsFeed({ className = '' }: { className?: string }) {
    const { preferences } = usePersonalization();
    const [insights, setInsights] = useState<ScoredInsight[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        fetch('/api/personalization/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                preferences,
                watchlistSymbols: preferences.favoriteStocks || [],
            }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (isMounted && data.success && data.data?.insights) {
                    setInsights(data.data.insights);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [preferences]);

    const categoryBadges: Record<string, { label: string; text: string; bg: string }> = {
        volume: { label: 'Volume Alert', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
        sentiment: { label: 'Sentiment Pulse', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
        technical: { label: 'Technical Signal', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
        macro: { label: 'Macro Shift', text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
        fundamental: { label: 'Fundamental', text: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' },
        risk: { label: 'Risk Caution', text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
                        Personalized AI Market Stream
                    </h2>
                    <p className="text-xs text-gray-400">
                        Dynamically ranked by multi-factor relevance to your {preferences.experienceLevel} • {preferences.riskTolerance} profile
                    </p>
                </div>

                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Live Ranked
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.slice(0, 6).map((item) => {
                    const badge = categoryBadges[item.category] || categoryBadges.macro;
                    return (
                        <div
                            key={item.id}
                            className="flex flex-col justify-between rounded-2xl border border-gray-800 bg-gray-900/70 p-4 backdrop-blur shadow-md hover:border-gray-700 transition space-y-3"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}
                                    >
                                        {badge.label}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold text-emerald-400/90 bg-gray-800/80 px-1.5 py-0.5 rounded">
                                            {item.score} Match
                                        </span>
                                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {item.timeAgo}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-200 leading-relaxed font-normal">
                                    {item.content}
                                </p>

                                {/* Relevance explanation tags */}
                                {item.relevanceReasons && item.relevanceReasons.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {item.relevanceReasons.map((reason, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[10px] text-gray-400 bg-gray-800/60 border border-gray-800 px-2 py-0.5 rounded-md"
                                            >
                                                {reason}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {item.relatedSymbol && (
                                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                        ${item.relatedSymbol}
                                    </span>
                                    <Link
                                        href={`/stocks/${item.relatedSymbol}`}
                                        className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-emerald-300 transition font-medium"
                                    >
                                        Intelligence Page
                                        <ArrowUpRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
