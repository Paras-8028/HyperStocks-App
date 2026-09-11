'use client';

import React, { useState, useEffect } from 'react';
import { usePersonalization } from '@/context/PersonalizationContext';
import { ScoredOpportunity } from '@/types/personalization';
import {
    ArrowUpRight,
    CheckCircle2,
    SlidersHorizontal,
    Sparkles,
    Target,
    Zap,
} from 'lucide-react';
import Link from 'next/link';

export function AIOpportunitiesRadar({ className = '' }: { className?: string }) {
    const { preferences, openOnboarding } = usePersonalization();
    const [opportunities, setOpportunities] = useState<ScoredOpportunity[]>([]);
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
                if (isMounted && data.success && data.data?.recommendations) {
                    setOpportunities(data.data.recommendations);
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

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-400" />
                        AI Opportunities Radar
                        <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Personalized
                        </span>
                    </h2>
                    <p className="text-xs text-gray-400">
                        Ranked for a{' '}
                        <span className="text-emerald-300 font-medium">
                            {preferences.riskTolerance}
                        </span>{' '}
                        profile prioritizing{' '}
                        <span className="text-emerald-300 font-medium">
                            {preferences.preferredSectors?.slice(0, 2).join(' & ') || 'Technology'}
                        </span>
                    </p>
                </div>

                <button
                    onClick={openOnboarding}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-800 bg-gray-900/80 text-xs font-medium text-gray-300 hover:text-emerald-400 hover:border-emerald-500/30 transition"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Tune Personalization
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {opportunities.slice(0, 3).map((opp) => (
                    <div
                        key={opp.symbol}
                        className="flex flex-col justify-between rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-gray-900/90 to-emerald-950/10 p-5 backdrop-blur shadow-lg space-y-4 hover:border-emerald-500/40 transition"
                    >
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-gray-100">
                                            {opp.symbol}
                                        </span>
                                        <span className="text-xs text-gray-400 truncate max-w-[120px]">
                                            {opp.company}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                        Horizon: <span className="text-gray-300 font-medium">{opp.timeframe}</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 font-mono">
                                        {opp.matchScore}% Match
                                    </span>
                                </div>
                            </div>

                            {/* Why it matches user preferences */}
                            {opp.matchingFactors && opp.matchingFactors.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {opp.matchingFactors.slice(0, 2).map((factor, i) => (
                                        <span
                                            key={i}
                                            className="text-[10px] text-teal-300/90 bg-teal-950/40 border border-teal-500/20 px-2 py-0.5 rounded-md"
                                        >
                                            {factor}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-gray-300 leading-relaxed bg-gray-850/60 p-3 rounded-xl border border-gray-800">
                                {opp.thesis}
                            </p>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center gap-1.5 font-semibold text-yellow-400 text-[11px]">
                                    <Zap className="h-3 w-3" />
                                    Expected Catalyst
                                </div>
                                <p className="text-[11px] text-gray-400 leading-snug">{opp.catalyst}</p>
                            </div>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-gray-800/80">
                            <div className="text-[11px] font-mono text-gray-400 bg-gray-850 px-2.5 py-1 rounded">
                                {opp.metricsHighlight}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1">
                                <span className="text-[11px] text-gray-400">
                                    Risk:{' '}
                                    <span
                                        className={`font-semibold ${
                                            opp.risk === 'Low'
                                                ? 'text-emerald-400'
                                                : opp.risk === 'High'
                                                ? 'text-rose-400'
                                                : 'text-amber-400'
                                        }`}
                                    >
                                        {opp.risk}
                                    </span>
                                </span>

                                <Link
                                    href={`/stocks/${opp.symbol}`}
                                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                                >
                                    Deep Analysis
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
