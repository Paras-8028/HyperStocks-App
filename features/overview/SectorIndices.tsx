'use client';

import React from 'react';
import Link from 'next/link';
import { SectorIndexItem } from './types';
import { ArrowDownRight, ArrowUpRight, Compass, PieChart } from 'lucide-react';

interface SectorIndicesProps {
    sectors: SectorIndexItem[];
}

export function SectorIndices({ sectors }: SectorIndicesProps) {
    if (!sectors || sectors.length === 0) return null;

    // Find min and max for relative bar calculation
    const maxPct = Math.max(...sectors.map((s) => Math.abs(s.percentChange)), 1);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-[#F4F7FF] flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-[#7C5CFF]" />
                        <span>Sector Performance & Relative Strength</span>
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                        Benchmark S&P Select Sector SPDR ETFs ranked by daily momentum.
                    </p>
                </div>
                <span className="text-[10px] font-mono text-[#7C5CFF] bg-[#7C5CFF]/10 px-2 py-0.5 rounded-full border border-[#7C5CFF]/30">
                    S&P Sectors
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {sectors.map((sec) => {
                    const isPositive = sec.percentChange >= 0;
                    const sign = isPositive ? '+' : '';
                    const barWidth = Math.min(Math.round((Math.abs(sec.percentChange) / maxPct) * 100), 100);

                    return (
                        <Link
                            key={sec.symbol}
                            href={`/stocks/${sec.symbol}`}
                            className="orbital-card orbital-card-interactive p-4 flex flex-col justify-between group space-y-3"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-[#F4F7FF] group-hover:text-[#35D6FF] transition-colors">
                                            {sec.name}
                                        </span>
                                    </div>
                                    <div className="text-[10px] font-mono text-[#94A3B8]">
                                        {sec.symbol} • {sec.etfName}
                                    </div>
                                </div>

                                <div
                                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                                        isPositive
                                            ? 'bg-[#3DFFA0]/15 border-[#3DFFA0]/30 text-[#3DFFA0]'
                                            : 'bg-[#FF5470]/15 border-[#FF5470]/30 text-[#FF5470]'
                                    }`}
                                >
                                    {isPositive ? (
                                        <ArrowUpRight className="h-3 w-3" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3" />
                                    )}
                                    <span>
                                        {sign}
                                        {sec.percentChange.toFixed(2)}%
                                    </span>
                                </div>
                            </div>

                            {/* Relative Strength Bar */}
                            <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-mono font-bold text-[#F4F7FF]">
                                        ${sec.price.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-[#94A3B8] font-mono">
                                        Rank #{sec.performanceRank || 1}
                                    </span>
                                </div>

                                <div className="w-full h-1.5 rounded-full bg-[#050816] overflow-hidden border border-[rgba(148,163,184,0.1)]">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            isPositive
                                                ? 'bg-gradient-to-r from-[#3DFFA0]/40 to-[#3DFFA0]'
                                                : 'bg-gradient-to-r from-[#FF5470]/40 to-[#FF5470]'
                                        }`}
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
