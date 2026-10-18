'use client';

import React, { useState } from 'react';
import { AIDailyBriefingData } from '@/types/ai';
import { UserPreferences } from '@/types/personalization';
import { usePersonalization } from '@/context/PersonalizationContext';
import {
    AlertCircle,
    ArrowUpRight,
    Calendar,
    CheckCircle2,
    Compass,
    Flame,
    RefreshCw,
    ShieldAlert,
    SlidersHorizontal,
    Sparkles,
    TrendingUp,
    Zap,
} from 'lucide-react';
import Link from 'next/link';

export interface AIDailyBriefingProps {
    initialData?: Partial<AIDailyBriefingData>;
    userPreferences?: Partial<UserPreferences>;
    watchlistSymbols?: string[];
    className?: string;
}

export function AIDailyBriefing({
    initialData,
    userPreferences: propPreferences,
    watchlistSymbols = ['AAPL', 'NVDA', 'MSFT', 'AMZN'],
    className = '',
}: AIDailyBriefingProps) {
    const { preferences, openOnboarding } = usePersonalization();
    const userPreferences = { ...preferences, ...(propPreferences || {}) };
    const defaultData: AIDailyBriefingData = {
        greeting: `Good morning, ${userPreferences?.name?.split(' ')[0] || 'Investor'}. Markets are showing dynamic momentum today.`,
        marketSummary:
            'Major indices are trading higher following cooling inflation prints and strong semiconductor earnings. Your watchlist is up +1.8%, with Technology and Growth equities driving most of the movement.',
        watchlistImpact: {
            changePercent: 1.84,
            trend: 'up',
            driver: 'Semiconductors & Cloud Infrastructure',
        },
        attentionStocks: [
            {
                symbol: watchlistSymbols[0] || 'NVDA',
                reason: 'Trading +3.8% on heavy volume following datacenter revenue upward revision.',
                priority: 'high',
            },
            {
                symbol: watchlistSymbols[1] || 'AAPL',
                reason: 'Approaching key 50-day moving average resistance with upcoming developer event.',
                priority: 'medium',
            },
        ],
        importantEvents: [
            'FOMC Interest Rate Decision & Press Conference (2:00 PM EST)',
            'Semiconductor Sector Global Supply Chain Briefing',
            'Crude Oil Inventory Weekly Report',
        ],
        keyOpportunities: [
            'Oversold tech turnaround with bullish volume divergence in chipmakers',
            'Defensive utility breakout providing steady 4.2% dividend yields',
        ],
        keyRisks: [
            '10-Year Treasury Yield fluctuation creating intraday valuation pressure',
            'Portfolio concentration in tech sector exceeds recommended 35% threshold',
        ],
        dateFormatted: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }),
    };

    const [briefing, setBriefing] = useState<AIDailyBriefingData>({
        ...defaultData,
        ...(initialData as any),
    });
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
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
            if (data.success && data.data) {
                const ai = data.data;
                setBriefing((prev) => ({
                    ...prev,
                    marketSummary: ai.headline + '. ' + ai.macroFocus,
                    importantEvents: ai.personalizedInsights?.slice(0, 3) || prev.importantEvents,
                }));
            }
        } catch (e) {
            console.error('Refresh error:', e);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div
            className={`relative overflow-hidden rounded-3xl border border-[#7C5CFF]/30 bg-gradient-to-br from-[#0D1424] via-[#080D1B] to-[#0D1424] p-6 md:p-8 backdrop-blur-2xl shadow-2xl space-y-6 ${className}`}
        >
            {/* Ambient background glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#7C5CFF]/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#35D6FF]/10 blur-3xl" />

            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(148,163,184,0.14)] pb-5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#35D6FF]">
                        <Sparkles className="h-4 w-4 text-[#7C5CFF] animate-pulse" />
                        HyperStocks Intelligence Briefing
                        <span className="text-[#94A3B8]/40">•</span>
                        <span className="text-[#94A3B8] font-normal">{briefing.dateFormatted}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-[#F4F7FF] tracking-tight">
                        {briefing.greeting}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={openOnboarding}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(148,163,184,0.18)] bg-[#111B2E] px-3.5 py-2 text-xs font-semibold text-[#F4F7FF] hover:border-[#7C5CFF]/50 transition"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-[#35D6FF]" />
                        Personalize Engine
                    </button>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] px-4 py-2 text-xs font-bold text-[#050816] hover:brightness-110 transition disabled:opacity-50 shadow-md shadow-[#7C5CFF]/20"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#050816]' : ''}`} />
                        {refreshing ? 'Synthesizing...' : 'Refresh AI Intelligence'}
                    </button>
                </div>
            </div>

            {/* Core Executive Summary */}
            <div className="rounded-2xl border border-[#35D6FF]/25 bg-[#111B2E]/60 p-5 backdrop-blur space-y-3 shadow-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-[#35D6FF] uppercase tracking-wider">
                    <Compass className="h-4 w-4 text-[#35D6FF]" />
                    Market Pulse & Constellation Impact
                </div>
                <p className="text-sm md:text-base text-[#F4F7FF] leading-relaxed font-normal">
                    {briefing.marketSummary}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[rgba(148,163,184,0.12)] text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-[#94A3B8]">Watchlist Estimated Move:</span>
                        <span className="font-bold text-[#3DFFA0] bg-[#3DFFA0]/15 px-2.5 py-0.5 rounded-full border border-[#3DFFA0]/30 font-mono">
                            +{briefing.watchlistImpact.changePercent}% Today
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#94A3B8]">
                        <span>Leading Driver:</span>
                        <span className="font-semibold text-[#F4F7FF]">{briefing.watchlistImpact.driver}</span>
                    </div>
                </div>
            </div>

            {/* 4-Pillar Tactical Grid: Attention, Events, Opportunities, Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Stocks Requiring Attention */}
                <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/80 p-4 space-y-3 flex flex-col justify-between backdrop-blur">
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                            <Flame className="h-4 w-4" />
                            Requires Attention
                        </div>
                        <div className="space-y-2 text-xs">
                            {briefing.attentionStocks.map((item, idx) => (
                                <Link
                                    key={idx}
                                    href={`/stocks/${item.symbol}`}
                                    className="group block rounded-xl bg-[#111B2E]/70 p-2.5 border border-[rgba(148,163,184,0.1)] hover:border-[#7C5CFF]/50 transition"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-[#F4F7FF] group-hover:text-[#35D6FF] transition">
                                            ${item.symbol}
                                        </span>
                                        <span
                                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                                item.priority === 'high'
                                                    ? 'bg-[#FF5470]/20 text-[#FF5470]'
                                                    : 'bg-amber-500/20 text-amber-400'
                                            }`}
                                        >
                                            {item.priority}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#94A3B8] leading-snug line-clamp-2">
                                        {item.reason}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Key Events Today */}
                <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/80 p-4 space-y-2.5 backdrop-blur">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#35D6FF] uppercase tracking-wider">
                        <Calendar className="h-4 w-4" />
                        Catalysts & Events
                    </div>
                    <ul className="space-y-2 text-xs text-[#CBD5E1]">
                        {briefing.importantEvents.map((evt, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#35D6FF] font-bold shrink-0 mt-0.5">•</span>
                                <span className="text-[11px] leading-snug text-[#CBD5E1]">{evt}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 3. High-Conviction Opportunities */}
                <div className="rounded-2xl border border-[#3DFFA0]/25 bg-[#0D1424]/80 p-4 space-y-2.5 backdrop-blur">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#3DFFA0] uppercase tracking-wider">
                        <Zap className="h-4 w-4" />
                        Opportunities
                    </div>
                    <ul className="space-y-2 text-xs text-[#CBD5E1]">
                        {briefing.keyOpportunities.map((opp, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#3DFFA0] shrink-0 mt-0.5" />
                                <span className="text-[11px] leading-snug text-[#CBD5E1]">{opp}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 4. Active Risks & Volatility */}
                <div className="rounded-2xl border border-[#FF5470]/25 bg-[#0D1424]/80 p-4 space-y-2.5 backdrop-blur">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF5470] uppercase tracking-wider">
                        <ShieldAlert className="h-4 w-4" />
                        Risk & Volatility Radar
                    </div>
                    <ul className="space-y-2 text-xs text-[#CBD5E1]">
                        {briefing.keyRisks.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <AlertCircle className="h-3.5 w-3.5 text-[#FF5470] shrink-0 mt-0.5" />
                                <span className="text-[11px] leading-snug text-[#CBD5E1]">{risk}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
