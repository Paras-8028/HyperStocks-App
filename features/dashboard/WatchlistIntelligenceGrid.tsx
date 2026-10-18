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
        'Strong Buy': 'text-[#3DFFA0] bg-[#3DFFA0]/15 border-[#3DFFA0]/30',
        Buy: 'text-[#35D6FF] bg-[#35D6FF]/15 border-[#35D6FF]/30',
        Neutral: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        Sell: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
        'Strong Sell': 'text-[#FF5470] bg-[#FF5470]/15 border-[#FF5470]/30',
    };

    const riskBadge: Record<WatchlistIntelligenceItem['riskLevel'], string> = {
        Low: 'text-[#3DFFA0] border-[#3DFFA0]/30 bg-[#3DFFA0]/10',
        Medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        High: 'text-[#FF5470] border-[#FF5470]/30 bg-[#FF5470]/10',
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-[#F4F7FF] flex items-center gap-2">
                        <Eye className="h-5 w-5 text-[#35D6FF]" />
                        Watchlist Intelligence Telemetry
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                        Contextual AI synthesis explaining intraday price drivers, sentiment balance, and tactical risk ratings
                    </p>
                </div>
                <Link
                    href="/watchlist"
                    className="text-xs font-semibold text-[#35D6FF] hover:text-[#3DFFA0] flex items-center gap-1 transition"
                >
                    Full Watchlist <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.map((item) => (
                    <div
                        key={item.symbol}
                        className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/85 p-5 backdrop-blur space-y-4 shadow-xl hover:border-[#7C5CFF]/40 hover:-translate-y-1 transition duration-200"
                    >
                        {/* Ticker Header */}
                        <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/stocks/${item.symbol}`}
                                        className="text-base font-bold text-[#F4F7FF] hover:text-[#35D6FF] transition font-mono"
                                    >
                                        ${item.symbol}
                                    </Link>
                                    <span className="text-xs text-[#94A3B8] truncate max-w-[160px]">
                                        {item.company}
                                    </span>
                                </div>
                                <div className="text-xs text-[#94A3B8]">
                                    Conviction: <span className="font-semibold text-[#CBD5E1] font-mono">{item.confidenceScore}%</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-base font-bold text-[#F4F7FF] font-mono">
                                    ${item.currentPrice.toFixed(2)}
                                </div>
                                <div
                                    className={`text-xs font-bold font-mono flex items-center justify-end gap-0.5 ${
                                        item.changePercent >= 0 ? 'text-[#3DFFA0]' : 'text-[#FF5470]'
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
                        <div className="rounded-xl bg-[#111B2E]/60 p-3 border border-[rgba(148,163,184,0.1)] space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#35D6FF] uppercase tracking-wider">
                                <Sparkles className="h-3 w-3 text-[#7C5CFF]" />
                                Planetary Driver
                            </div>
                            <p className="text-xs text-[#CBD5E1] leading-relaxed">
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

                            <div className="flex items-center gap-1.5 text-[#94A3B8] text-[11px]">
                                <span>Sentiment:</span>
                                <span
                                    className={`font-semibold capitalize ${
                                        item.newsSentiment === 'bullish'
                                            ? 'text-[#3DFFA0]'
                                            : item.newsSentiment === 'bearish'
                                            ? 'text-[#FF5470]'
                                            : 'text-[#CBD5E1]'
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
