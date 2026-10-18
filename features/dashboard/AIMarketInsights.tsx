'use client';

import React, { useState } from 'react';
import { AIMarketInsightItem } from '@/types/ai';
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    Clock,
    Layers,
    Newspaper,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Volume2,
    Zap,
} from 'lucide-react';
import Link from 'next/link';

export function AIMarketInsights({ className = '' }: { className?: string }) {
    const [activeFilter, setActiveFilter] = useState<string>('all');

    const insights: AIMarketInsightItem[] = [
        {
            id: 'ins-1',
            type: 'unusual_volume',
            title: 'Unusual Institutional Inflow in NVDA',
            symbol: 'NVDA',
            description: 'Trading volume reached 185% of its 30-day average, signaling aggressive block accumulation ahead of product announcements.',
            metric: 'Volume: 1.85x Avg',
            sentiment: 'bullish',
            timestamp: '14m ago',
        },
        {
            id: 'ins-2',
            type: 'trending_sector',
            title: 'Semiconductors & AI Hardware Outperforming',
            description: 'The SOX Semiconductor Index gained +2.4% today, leading all S&P sub-sectors as enterprise cloud capex projections rise.',
            metric: '+2.40% Today',
            sentiment: 'bullish',
            timestamp: '32m ago',
        },
        {
            id: 'ins-3',
            type: 'unusual_movement',
            title: 'Sharp Intraday Reversal in Tesla (TSLA)',
            symbol: 'TSLA',
            description: 'Rebounded +4.2% from daily lows after finding strong technical support around the 200-day exponential moving average.',
            metric: 'Rebound: +4.2%',
            sentiment: 'bullish',
            timestamp: '48m ago',
        },
        {
            id: 'ins-4',
            type: 'earnings',
            title: 'Major Cloud & SaaS Earnings Imminent',
            description: 'Enterprise software earnings cycle kicks off next Tuesday. Options market is pricing an average ±6.8% implied volatility move.',
            metric: '±6.8% Implied',
            sentiment: 'neutral',
            timestamp: '1h ago',
        },
        {
            id: 'ins-5',
            type: 'breaking_news',
            title: 'Federal Reserve Member Signals Flexible Rate Stance',
            description: 'Dovish commentary on neutral interest rates triggered an immediate decline in the 10-year Treasury yield to 4.18%.',
            metric: 'Yield: 4.18%',
            sentiment: 'bullish',
            timestamp: '2h ago',
        },
        {
            id: 'ins-6',
            type: 'unusual_movement',
            title: 'Energy Sector (XLE) Facing Momentum Fatigue',
            description: 'Crude inventory build causes short-term profit taking across integrated oil majors, pushing RSI down to 42.',
            metric: '-1.6% Sector',
            sentiment: 'bearish',
            timestamp: '3h ago',
        },
    ];

    const filtered = activeFilter === 'all'
        ? insights
        : insights.filter((item) => item.type === activeFilter);

    const categories = [
        { id: 'all', label: 'All Insights', icon: Sparkles },
        { id: 'unusual_volume', label: 'Unusual Volume', icon: Volume2 },
        { id: 'trending_sector', label: 'Trending Sectors', icon: Layers },
        { id: 'unusual_movement', label: 'Price Movements', icon: Activity },
        { id: 'earnings', label: 'Earnings Events', icon: BarChart3 },
        { id: 'breaking_news', label: 'News Impact', icon: Newspaper },
    ];

    return (
        <div className={`space-y-5 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[#F4F7FF] flex items-center gap-2">
                        <Zap className="h-5 w-5 text-[#35D6FF]" />
                        Market Events & Insights
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                        Algorithmic telemetry tracking unusual volume surges, sector rotation velocity, and breaking macro catalysts
                    </p>
                </div>

                {/* Filter pills */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#0D1424] p-1.5 border border-[rgba(148,163,184,0.14)] backdrop-blur">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const active = activeFilter === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveFilter(cat.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                                    active
                                        ? 'bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-[#050816] font-bold shadow-md shadow-[#7C5CFF]/20'
                                        : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E]'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Insights cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((item) => (
                    <div
                        key={item.id}
                        className="group flex flex-col justify-between rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/85 p-5 hover:border-[#7C5CFF]/40 hover:-translate-y-1 transition duration-200 backdrop-blur space-y-3 shadow-xl"
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                            item.sentiment === 'bullish'
                                                ? 'bg-[#3DFFA0]/15 text-[#3DFFA0] border-[#3DFFA0]/30'
                                                : item.sentiment === 'bearish'
                                                ? 'bg-[#FF5470]/15 text-[#FF5470] border-[#FF5470]/30'
                                                : 'bg-[#111B2E] text-[#35D6FF] border-[#35D6FF]/30'
                                        }`}
                                    >
                                        {item.sentiment === 'bullish' ? (
                                            <TrendingUp className="h-3 w-3" />
                                        ) : item.sentiment === 'bearish' ? (
                                            <TrendingDown className="h-3 w-3" />
                                        ) : (
                                            <Activity className="h-3 w-3" />
                                        )}
                                        {item.sentiment.toUpperCase()} • {item.type.replace('_', ' ')}
                                    </span>

                                    {item.symbol && (
                                        <Link
                                            href={`/stocks/${item.symbol}`}
                                            className="text-xs font-bold text-[#F4F7FF] hover:text-[#35D6FF] transition"
                                        >
                                            ${item.symbol}
                                        </Link>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                                    <Clock className="h-3 w-3" />
                                    {item.timestamp}
                                </div>
                            </div>

                            <h4 className="text-sm font-semibold text-[#F4F7FF] group-hover:text-[#35D6FF] transition leading-snug">
                                {item.title}
                            </h4>

                            <p className="text-xs text-[#94A3B8] leading-relaxed">
                                {item.description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[rgba(148,163,184,0.12)] text-xs">
                            {item.metric && (
                                <span className="font-mono text-xs font-bold text-[#CBD5E1] bg-[#111B2E] px-2.5 py-0.5 rounded-lg border border-[rgba(148,163,184,0.1)]">
                                    {item.metric}
                                </span>
                            )}
                            {item.symbol && (
                                <Link
                                    href={`/stocks/${item.symbol}`}
                                    className="inline-flex items-center gap-1 text-xs text-[#35D6FF] hover:text-[#3DFFA0] font-medium ml-auto transition"
                                >
                                    Deep Dive <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
