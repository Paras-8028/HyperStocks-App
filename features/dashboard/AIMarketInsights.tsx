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
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-emerald-400" />
                        AI Market Insights
                    </h2>
                    <p className="text-xs text-gray-400">
                        Real-time algorithmic detection of abnormal volume, sector rotations, and market catalyst events
                    </p>
                </div>

                {/* Filter pills */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-gray-900/80 p-1.5 border border-gray-800 backdrop-blur">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const active = activeFilter === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveFilter(cat.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                                    active
                                        ? 'bg-emerald-500 text-gray-950 font-bold shadow-md shadow-emerald-500/20'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
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
                        className="group flex flex-col justify-between rounded-2xl border border-gray-800 bg-gray-900/60 p-5 hover:border-gray-700 hover:bg-gray-850/60 transition backdrop-blur space-y-3 shadow-lg"
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                            item.sentiment === 'bullish'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                : item.sentiment === 'bearish'
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                                : 'bg-gray-800 text-gray-400 border-gray-700'
                                        }`}
                                    >
                                        {item.sentiment === 'bullish' ? (
                                            <TrendingUp className="h-3 w-3" />
                                        ) : item.sentiment === 'bearish' ? (
                                            <TrendingDown className="h-3 w-3" />
                                        ) : (
                                            <Activity className="h-3 w-3" />
                                        )}
                                        {item.type.replace('_', ' ')}
                                    </span>

                                    {item.symbol && (
                                        <Link
                                            href={`/stocks/${item.symbol}`}
                                            className="text-xs font-bold text-gray-200 hover:text-emerald-400 transition"
                                        >
                                            ${item.symbol}
                                        </Link>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {item.timestamp}
                                </div>
                            </div>

                            <h4 className="text-sm font-semibold text-gray-100 group-hover:text-emerald-300 transition leading-snug">
                                {item.title}
                            </h4>

                            <p className="text-xs text-gray-400 leading-relaxed">
                                {item.description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-800/80 text-xs">
                            {item.metric && (
                                <span className="font-mono text-xs font-bold text-gray-300 bg-gray-800 px-2 py-0.5 rounded">
                                    {item.metric}
                                </span>
                            )}
                            {item.symbol && (
                                <Link
                                    href={`/stocks/${item.symbol}`}
                                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium ml-auto"
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
