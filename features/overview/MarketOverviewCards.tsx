'use client';

import React from 'react';
import Link from 'next/link';
import { MarketIndexItem } from './types';
import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';

interface MarketOverviewCardsProps {
    indices: MarketIndexItem[];
}

function MiniSparkline({ points, isPositive }: { points: number[]; isPositive: boolean }) {
    if (!points || points.length < 2) return null;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 110;
    const height = 36;
    const padding = 2;

    const coords = points.map((val, idx) => {
        const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((val - min) / range) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${coords.join(' L ')}`;
    const strokeColor = isPositive ? '#3DFFA0' : '#FF5470';
    const gradientId = `sparkline-grad-${isPositive ? 'pos' : 'neg'}-${Math.random().toString(36).substring(2, 7)}`;

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                </linearGradient>
            </defs>
            {/* Area fill */}
            <path
                d={`${pathD} L ${width - padding},${height} L ${padding},${height} Z`}
                fill={`url(#${gradientId})`}
            />
            {/* Stroke line */}
            <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function MarketOverviewCards({ indices }: MarketOverviewCardsProps) {
    if (!indices || indices.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#F4F7FF] flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#7C5CFF]" />
                    <span>Benchmark Indices</span>
                </h2>
                <span className="text-[11px] font-mono text-[#94A3B8]">
                    Real-Time Quotes
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {indices.map((idx) => {
                    const isPositive = idx.percentChange >= 0;
                    const sign = isPositive ? '+' : '';

                    return (
                        <Link
                            key={idx.symbol}
                            href={`/stocks/${idx.symbol}`}
                            className="orbital-card orbital-card-interactive flex flex-col justify-between p-4 group"
                        >
                            {/* Card Top: Name & Symbol */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-xs font-bold text-[#F4F7FF] group-hover:text-[#35D6FF] transition-colors">
                                        {idx.name}
                                    </div>
                                    <div className="text-[10px] font-mono text-[#94A3B8]">
                                        {idx.symbol} ({idx.displaySymbol})
                                    </div>
                                </div>

                                <div
                                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                                        isPositive
                                            ? 'bg-[#3DFFA0]/10 border-[#3DFFA0]/25 text-[#3DFFA0]'
                                            : 'bg-[#FF5470]/10 border-[#FF5470]/25 text-[#FF5470]'
                                    }`}
                                >
                                    {isPositive ? (
                                        <ArrowUpRight className="h-3 w-3" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3" />
                                    )}
                                    <span>
                                        {sign}
                                        {idx.percentChange.toFixed(2)}%
                                    </span>
                                </div>
                            </div>

                            {/* Card Bottom: Price & Sparkline */}
                            <div className="flex items-end justify-between pt-4">
                                <div>
                                    <div className="text-lg font-extrabold font-mono text-[#F4F7FF] tracking-tight">
                                        ${idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div
                                        className={`text-[11px] font-mono font-medium ${
                                            isPositive ? 'text-[#3DFFA0]' : 'text-[#FF5470]'
                                        }`}
                                    >
                                        {sign}
                                        {idx.change.toFixed(2)}
                                    </div>
                                </div>

                                <div className="shrink-0 pl-2">
                                    <MiniSparkline points={idx.sparkline} isPositive={isPositive} />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
