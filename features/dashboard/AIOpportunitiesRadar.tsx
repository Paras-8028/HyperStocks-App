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
                    <h2 className="text-xl font-bold text-[#F4F7FF] flex items-center gap-2">
                        <Target className="h-5 w-5 text-[#3DFFA0]" />
                        <span>AI Opportunities Radar</span>
                        <span className="text-[11px] font-semibold text-[#3DFFA0] bg-[#3DFFA0]/10 px-2.5 py-0.5 rounded-full border border-[#3DFFA0]/30">
                            AI Ranked
                        </span>
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                        Calibrated for a{' '}
                        <span className="text-[#3DFFA0] font-medium">
                            {preferences.riskTolerance}
                        </span>{' '}
                        profile prioritizing{' '}
                        <span className="text-[#35D6FF] font-medium">
                            {preferences.preferredSectors?.slice(0, 2).join(' & ') || 'Technology & Growth'}
                        </span>
                    </p>
                </div>

                <button
                    onClick={openOnboarding}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgba(148,163,184,0.2)] bg-[#111B2E]/70 text-xs font-medium text-[#F4F7FF] hover:text-[#35D6FF] hover:border-[#35D6FF]/40 transition"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Tune Radar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {opportunities.slice(0, 3).map((opp) => (
                    <div
                        key={opp.symbol}
                        className="orbital-card orbital-card-interactive flex flex-col justify-between p-5 space-y-4"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold font-mono text-[#F4F7FF]">
                                            {opp.symbol}
                                        </span>
                                        <span className="text-xs text-[#94A3B8] truncate max-w-[120px]">
                                            {opp.company}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-[#94A3B8]">
                                        Horizon: <span className="text-[#F4F7FF] font-medium">{opp.timeframe}</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-xs font-bold text-[#3DFFA0] bg-[#3DFFA0]/10 px-2.5 py-1 rounded-full border border-[#3DFFA0]/30 font-mono">
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
                                            className="text-[10px] text-[#35D6FF] bg-[#35D6FF]/10 border border-[#35D6FF]/20 px-2 py-0.5 rounded-md"
                                        >
                                            {factor}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-[#94A3B8] leading-relaxed bg-[#050816]/70 p-3 rounded-xl border border-[rgba(148,163,184,0.1)]">
                                {opp.thesis}
                            </p>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center gap-1.5 font-semibold text-amber-300 text-[11px]">
                                    <Zap className="h-3 w-3" />
                                    Expected Catalyst
                                </div>
                                <p className="text-[11px] text-[#94A3B8] leading-snug">{opp.catalyst}</p>
                            </div>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-[rgba(148,163,184,0.12)]">
                            <div className="text-[11px] font-mono text-[#94A3B8] bg-[#050816]/60 px-2.5 py-1 rounded border border-[rgba(148,163,184,0.08)]">
                                {opp.metricsHighlight}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1">
                                <span className="text-[11px] text-[#94A3B8]">
                                    Risk:{' '}
                                    <span
                                        className={`font-semibold ${
                                            opp.risk === 'Low'
                                                ? 'text-[#3DFFA0]'
                                                : opp.risk === 'High'
                                                ? 'text-[#FF5470]'
                                                : 'text-amber-300'
                                        }`}
                                    >
                                        {opp.risk}
                                    </span>
                                </span>

                                <Link
                                    href={`/stocks/${opp.symbol}`}
                                    className="inline-flex items-center gap-1 text-[#35D6FF] hover:text-[#7C5CFF] font-semibold transition"
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
