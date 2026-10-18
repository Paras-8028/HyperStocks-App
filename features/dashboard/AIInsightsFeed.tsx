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
        volume: { label: 'Volume Surge', text: 'text-[#3DFFA0]', bg: 'bg-[#3DFFA0]/10 border-[#3DFFA0]/30' },
        sentiment: { label: 'Sentiment Pulse', text: 'text-[#35D6FF]', bg: 'bg-[#35D6FF]/10 border-[#35D6FF]/30' },
        technical: { label: 'Technical Signal', text: 'text-[#7C5CFF]', bg: 'bg-[#7C5CFF]/15 border-[#7C5CFF]/30' },
        macro: { label: 'Macro Shift', text: 'text-purple-300', bg: 'bg-purple-500/10 border-purple-500/30' },
        fundamental: { label: 'Fundamental', text: 'text-cyan-300', bg: 'bg-cyan-500/10 border-cyan-500/30' },
        risk: { label: 'Risk Alert', text: 'text-[#FF5470]', bg: 'bg-[#FF5470]/10 border-[#FF5470]/30' },
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-[#F4F7FF] flex items-center gap-2">
                        <Radio className="h-5 w-5 text-[#35D6FF] animate-pulse" />
                        <span>Personalized AI Market Stream</span>
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                        Dynamically filtered by multi-factor relevance to your {preferences.experienceLevel} • {preferences.riskTolerance} profile
                    </p>
                </div>

                <span className="text-[11px] font-mono text-[#3DFFA0] bg-[#3DFFA0]/10 px-2.5 py-1 rounded-full border border-[#3DFFA0]/30">
                    Live Stream
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.slice(0, 6).map((item) => {
                    const badge = categoryBadges[item.category] || categoryBadges.macro;
                    return (
                        <div
                            key={item.id}
                            className="orbital-card orbital-card-interactive flex flex-col justify-between p-4 space-y-3"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}
                                    >
                                        {badge.label}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold text-[#3DFFA0] bg-[#050816]/70 px-1.5 py-0.5 rounded border border-[rgba(148,163,184,0.12)]">
                                            {item.score} Match
                                        </span>
                                        <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {item.timeAgo}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs text-[#F4F7FF]/90 leading-relaxed font-normal">
                                    {item.content}
                                </p>

                                {/* Relevance explanation tags */}
                                {item.relevanceReasons && item.relevanceReasons.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {item.relevanceReasons.map((reason, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[10px] text-[#94A3B8] bg-[#050816]/60 border border-[rgba(148,163,184,0.1)] px-2 py-0.5 rounded-md"
                                            >
                                                {reason}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {item.relatedSymbol && (
                                <div className="pt-2 border-t border-[rgba(148,163,184,0.12)] flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-[#35D6FF]">
                                        ${item.relatedSymbol}
                                    </span>
                                    <Link
                                        href={`/stocks/${item.relatedSymbol}`}
                                        className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8] hover:text-[#3DFFA0] transition font-medium"
                                    >
                                        Deep Analysis
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
