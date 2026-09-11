'use client';

import React, { useState } from 'react';
import { AIDailyBriefingData } from '@/types/ai';
import { UserPreferences } from '@/types/personalization';
import {
    AlertCircle,
    ArrowUpRight,
    Calendar,
    CheckCircle2,
    Compass,
    Flame,
    RefreshCw,
    ShieldAlert,
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
    userPreferences,
    watchlistSymbols = ['AAPL', 'NVDA', 'MSFT', 'AMZN'],
    className = '',
}: AIDailyBriefingProps) {
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
            className={`relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-gray-900 via-gray-900/95 to-emerald-950/20 p-6 md:p-8 backdrop-blur shadow-2xl space-y-6 ${className}`}
        >
            {/* Ambient background glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />

            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                        <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                        AI Financial Operating System
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400 font-normal">{briefing.dateFormatted}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-100 tracking-tight">
                        {briefing.greeting}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-700/80 bg-gray-800/60 px-3.5 py-2 text-xs font-medium text-gray-300 hover:bg-gray-750 hover:text-white transition disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
                        {refreshing ? 'Regenerating...' : 'Refresh AI Intelligence'}
                    </button>
                </div>
            </div>

            {/* Core Executive Summary */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/15 p-5 backdrop-blur space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <Compass className="h-4 w-4" />
                    Market Pulse & Watchlist Impact
                </div>
                <p className="text-sm md:text-base text-gray-200 leading-relaxed font-normal">
                    {briefing.marketSummary}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-800/80 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Watchlist Estimated Move:</span>
                        <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            +{briefing.watchlistImpact.changePercent}% Today
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <span>Leading Driver:</span>
                        <span className="font-semibold text-gray-200">{briefing.watchlistImpact.driver}</span>
                    </div>
                </div>
            </div>

            {/* 4-Pillar Tactical Grid: Attention, Events, Opportunities, Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Stocks Requiring Attention */}
                <div className="rounded-2xl border border-gray-800/80 bg-gray-850/40 p-4 space-y-3 flex flex-col justify-between backdrop-blur">
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
                                    className="group block rounded-xl bg-gray-800/60 p-2.5 border border-gray-750 hover:border-emerald-500/40 transition"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-gray-100 group-hover:text-emerald-400 transition">
                                            {item.symbol}
                                        </span>
                                        <span
                                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                                item.priority === 'high'
                                                    ? 'bg-rose-500/20 text-rose-400'
                                                    : 'bg-amber-500/20 text-amber-400'
                                            }`}
                                        >
                                            {item.priority}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-snug line-clamp-2">
                                        {item.reason}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Key Events Today */}
                <div className="rounded-2xl border border-gray-800/80 bg-gray-850/40 p-4 space-y-2.5 backdrop-blur">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
                        <Calendar className="h-4 w-4" />
                        Catalysts & Events
                    </div>
                    <ul className="space-y-2 text-xs text-gray-300">
                        {briefing.importantEvents.map((evt, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="text-blue-400 font-bold shrink-0 mt-0.5">•</span>
                                <span className="text-[11px] leading-snug text-gray-300">{evt}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 3. High-Conviction Opportunities */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-2.5 backdrop-blur">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <Zap className="h-4 w-4" />
                        Identified Opportunities
                    </div>
                    <ul className="space-y-2 text-xs text-gray-300">
                        {briefing.keyOpportunities.map((opp, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="text-[11px] leading-snug text-gray-300">{opp}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 4. Active Risks & Volatility */}
                <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-4 space-y-2.5 backdrop-blur">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                        <ShieldAlert className="h-4 w-4" />
                        Risk & Volatility Radar
                    </div>
                    <ul className="space-y-2 text-xs text-gray-300">
                        {briefing.keyRisks.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                                <span className="text-[11px] leading-snug text-gray-300">{risk}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
