'use client';

import React, { useState, useEffect } from 'react';
import { MarketBriefing } from '@/types/ai';
import { UserPreferences } from '@/types/personalization';
import { Sparkles, SunMedium, TrendingUp, Compass, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export interface PersonalizedMarketBriefingProps {
    watchlistSymbols?: string[];
    userPreferences?: Partial<UserPreferences>;
    className?: string;
}

export function PersonalizedMarketBriefing({
    watchlistSymbols = [],
    userPreferences,
    className = '',
}: PersonalizedMarketBriefingProps) {
    const [briefing, setBriefing] = useState<MarketBriefing | null>(null);
    const [loading, setLoading] = useState(false);

    const loadBriefing = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'market_briefing',
                    watchlistSymbols,
                    userPreferences,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setBriefing(data.data);
            }
        } catch (e) {
            console.error('Failed to load market briefing:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBriefing();
    }, [watchlistSymbols.join(',')]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-6 backdrop-blur animate-pulse space-y-3">
                <div className="h-5 w-48 bg-emerald-500/20 rounded-md" />
                <div className="h-4 w-full bg-gray-800 rounded-md" />
                <div className="h-4 w-3/4 bg-gray-800 rounded-md" />
            </div>
        );
    }

    if (!briefing) return null;

    const toneColors: Record<string, string> = {
        bullish: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        bearish: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        cautious: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        mixed: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    };

    return (
        <div
            className={`rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-gray-900/60 to-gray-900/90 p-6 backdrop-blur space-y-4 shadow-xl ${className}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800/80 pb-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <SunMedium className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                            Personalized Market Intelligence
                            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                                AI Morning Radar
                            </span>
                        </h3>
                        <p className="text-xs text-gray-400">
                            {briefing.date} • Tailored to {userPreferences?.preferredIndustry || 'Tech'} & your watchlist
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold uppercase tracking-wider ${
                            toneColors[briefing.marketTone] || toneColors.mixed
                        }`}
                    >
                        Market Tone: {briefing.marketTone}
                    </span>
                </div>
            </div>

            <h4 className="text-sm font-semibold text-gray-200">
                "{briefing.headline}"
            </h4>

            {/* Insights grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-gray-850/60 p-3.5 border border-gray-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                        <Compass className="h-3.5 w-3.5" />
                        Personalized Portfolio Signals
                    </div>
                    <ul className="space-y-1 text-gray-300">
                        {briefing.personalizedInsights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-400">→</span>
                                <span>{insight}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="rounded-xl bg-gray-850/60 p-3.5 border border-gray-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Macro Setup & Watchlist Catalysts
                    </div>
                    <p className="text-gray-300">{briefing.macroFocus}</p>
                    {briefing.watchlistHighlights && briefing.watchlistHighlights.length > 0 && (
                        <div className="pt-1.5 flex flex-wrap gap-1.5">
                            {briefing.watchlistHighlights.map((w, i) => (
                                <Link
                                    key={i}
                                    href={`/stocks/${w.symbol}`}
                                    className="inline-flex items-center gap-1 text-[11px] bg-gray-800 hover:bg-gray-750 px-2 py-0.5 rounded border border-gray-700 text-gray-200 transition"
                                >
                                    <span className="font-bold">{w.symbol}</span>
                                    <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
