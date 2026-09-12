'use client';

import React from 'react';
import { WatchlistIntelligenceItem } from '@/types/ai';
import {
    Activity,
    ArrowUpRight,
    CheckCircle,
    Eye,
    HelpCircle,
    Shield,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export interface WatchlistIntelligenceGridProps {
    items?: WatchlistIntelligenceItem[];
    className?: string;
}

export function WatchlistIntelligenceGrid({
    items,
    className = '',
}: WatchlistIntelligenceGridProps) {
    const defaultItems: WatchlistIntelligenceItem[] = [
        {
            symbol: 'NVDA',
            company: 'NVIDIA Corporation',
            currentPrice: 124.50,
            changePercent: 3.82,
            movementReason: 'Enterprise AI infrastructure demand remains robust with datacenter revenue margin expansion.',
            newsSentiment: 'bullish',
            sentimentScore: 0.82,
            technicalSignal: 'Strong Buy',
            riskLevel: 'Medium',
            confidenceScore: 91,
        },
        {
            symbol: 'AAPL',
            company: 'Apple Inc.',
            currentPrice: 228.15,
            changePercent: 1.15,
            movementReason: 'Services revenue acceleration and stabilizing hardware supply chain across key Asian markets.',
            newsSentiment: 'bullish',
            sentimentScore: 0.65,
            technicalSignal: 'Buy',
            riskLevel: 'Low',
            confidenceScore: 86,
        },
        {
            symbol: 'MSFT',
            company: 'Microsoft Corporation',
            currentPrice: 442.80,
            changePercent: 0.74,
            movementReason: 'Azure cloud growth meets buy-side estimates; copilot commercial monetization expanding.',
            newsSentiment: 'bullish',
            sentimentScore: 0.70,
            technicalSignal: 'Buy',
            riskLevel: 'Low',
            confidenceScore: 89,
        },
        {
            symbol: 'TSLA',
            company: 'Tesla, Inc.',
            currentPrice: 218.60,
            changePercent: -1.45,
            movementReason: 'Gross margin compression worries offset by positive sentiment around upcoming autonomous fleet roadmap.',
            newsSentiment: 'neutral',
            sentimentScore: 0.10,
            technicalSignal: 'Neutral',
            riskLevel: 'High',
            confidenceScore: 78,
        },
    ];

    const data = items && items.length > 0 ? items : defaultItems;

    const signalBadge: Record<WatchlistIntelligenceItem['technicalSignal'], string> = {
        'Strong Buy': 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
        Buy: 'text-green-400 bg-green-500/15 border-green-500/30',
        Neutral: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        Sell: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
        'Strong Sell': 'text-rose-400 bg-rose-500/15 border-rose-500/30',
    };

    const riskBadge: Record<WatchlistIntelligenceItem['riskLevel'], string> = {
        Low: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
        Medium: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
        High: 'text-rose-400 border-rose-500/30 bg-rose-950/20',
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Eye className="h-5 w-5 text-emerald-400" />
                        Watchlist Intelligence
                    </h2>
                    <p className="text-xs text-gray-400">
                        Contextual AI synthesis explaining intraday price drivers, sentiment balance, and tactical risk ratings
                    </p>
                </div>
                <Link
                    href="/watchlist"
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                    Full Watchlist <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.map((item) => (
                    <div
                        key={item.symbol}
                        className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 backdrop-blur space-y-4 shadow-lg hover:border-gray-700 transition"
                    >
                        {/* Ticker Header */}
                        <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/stocks/${item.symbol}`}
                                        className="text-base font-bold text-gray-100 hover:text-emerald-400 transition"
                                    >
                                        {item.symbol}
                                    </Link>
                                    <span className="text-xs text-gray-400 truncate max-w-[160px]">
                                        {item.company}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    Confidence: <span className="font-semibold text-gray-300">{item.confidenceScore}%</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-base font-bold text-gray-100">
                                    ${item.currentPrice.toFixed(2)}
                                </div>
                                <div
                                    className={`text-xs font-bold flex items-center justify-end gap-0.5 ${
                                        item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                >
                                    {item.changePercent >= 0 ? (
                                        <TrendingUp className="h-3 w-3" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3" />
                                    )}
                                    {item.changePercent >= 0 ? '+' : ''}
                                    {item.changePercent.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        {/* Why it's moving */}
                        <div className="rounded-xl bg-gray-850/50 p-3 border border-gray-800 space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                                <Sparkles className="h-3 w-3" />
                                Why It&apos;s Moving
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {item.movementReason}
                            </p>
                        </div>

                        {/* Tactical badges bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wider ${
                                        signalBadge[item.technicalSignal]
                                    }`}
                                >
                                    {item.technicalSignal}
                                </span>

                                <span
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 ${
                                        riskBadge[item.riskLevel]
                                    }`}
                                >
                                    <Shield className="h-3 w-3" />
                                    {item.riskLevel} Risk
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                                <span>Sentiment:</span>
                                <span
                                    className={`font-semibold capitalize ${
                                        item.newsSentiment === 'bullish'
                                            ? 'text-emerald-400'
                                            : item.newsSentiment === 'bearish'
                                            ? 'text-rose-400'
                                            : 'text-gray-300'
                                    }`}
                                >
                                    {item.newsSentiment} ({(item.sentimentScore * 100).toFixed(0)}%)
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
