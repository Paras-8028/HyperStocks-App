'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { HeatmapStockItem } from './types';
import { ArrowDownRight, ArrowUpRight, Flame, Layers } from 'lucide-react';

interface StockHeatmapProps {
    stocks: HeatmapStockItem[];
}

export function StockHeatmap({ stocks }: StockHeatmapProps) {
    const [selectedSector, setSelectedSector] = useState<string>('All');
    const [hoveredStock, setHoveredStock] = useState<HeatmapStockItem | null>(null);

    // Get unique sectors
    const sectors = useMemo(() => {
        const unique = Array.from(new Set(stocks.map((s) => s.sector))).filter(Boolean);
        return ['All', ...unique];
    }, [stocks]);

    // Filter stocks
    const filteredStocks = useMemo(() => {
        if (selectedSector === 'All') return stocks;
        return stocks.filter((s) => s.sector === selectedSector);
    }, [stocks, selectedSector]);

    // Compute color intensity based on percentChange
    const getTileStyle = (pct: number) => {
        if (pct >= 3.0) {
            return {
                bg: 'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-500/50 text-[#3DFFA0]',
                badgeBg: 'bg-emerald-500/30 text-[#3DFFA0]',
            };
        } else if (pct >= 1.5) {
            return {
                bg: 'bg-[#3DFFA0]/20 hover:bg-[#3DFFA0]/30 border-[#3DFFA0]/40 text-[#3DFFA0]',
                badgeBg: 'bg-[#3DFFA0]/20 text-[#3DFFA0]',
            };
        } else if (pct > 0) {
            return {
                bg: 'bg-[#3DFFA0]/10 hover:bg-[#3DFFA0]/20 border-[#3DFFA0]/25 text-[#3DFFA0]',
                badgeBg: 'bg-[#3DFFA0]/15 text-[#3DFFA0]',
            };
        } else if (pct <= -3.0) {
            return {
                bg: 'bg-rose-500/30 hover:bg-rose-500/40 border-rose-500/50 text-[#FF5470]',
                badgeBg: 'bg-rose-500/30 text-[#FF5470]',
            };
        } else if (pct <= -1.5) {
            return {
                bg: 'bg-[#FF5470]/20 hover:bg-[#FF5470]/30 border-[#FF5470]/40 text-[#FF5470]',
                badgeBg: 'bg-[#FF5470]/20 text-[#FF5470]',
            };
        } else if (pct < 0) {
            return {
                bg: 'bg-[#FF5470]/10 hover:bg-[#FF5470]/20 border-[#FF5470]/25 text-[#FF5470]',
                badgeBg: 'bg-[#FF5470]/15 text-[#FF5470]',
            };
        }
        return {
            bg: 'bg-[#111B2E]/70 hover:bg-[#111B2E] border-[rgba(148,163,184,0.15)] text-[#94A3B8]',
            badgeBg: 'bg-[#111B2E] text-[#94A3B8]',
        };
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-[#F4F7FF] flex items-center gap-2">
                        <Flame className="h-5 w-5 text-[#7C5CFF]" />
                        <span>Stock Heatmap</span>
                        <span className="text-xs font-mono font-medium text-[#94A3B8] bg-[#0D1424] px-2.5 py-0.5 rounded-full border border-[rgba(148,163,184,0.14)]">
                            Market Cap Weighted
                        </span>
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                        Interactive equities treemap visualizer. Tile sizes correlate to market capitalization.
                    </p>
                </div>

                {/* Sector filter tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                    {sectors.map((sec) => (
                        <button
                            key={sec}
                            onClick={() => setSelectedSector(sec)}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                                selectedSector === sec
                                    ? 'bg-[#111B2E] text-[#35D6FF] border border-[#35D6FF]/40 shadow-sm shadow-[#35D6FF]/10'
                                    : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#0D1424]'
                            }`}
                        >
                            {sec}
                        </button>
                    ))}
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="relative rounded-3xl orbital-card p-4 md:p-6 border border-[rgba(148,163,184,0.14)] overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                    {filteredStocks.map((stock) => {
                        const style = getTileStyle(stock.percentChange);
                        const isPositive = stock.percentChange >= 0;
                        const sign = isPositive ? '+' : '';

                        // Determine grid column and row span according to weight
                        const spanClass =
                            stock.weight === 3
                                ? 'col-span-2 row-span-2 min-h-[140px]'
                                : stock.weight === 2
                                ? 'col-span-2 sm:col-span-2 row-span-1 min-h-[100px]'
                                : 'col-span-1 min-h-[90px]';

                        return (
                            <Link
                                key={stock.symbol}
                                href={`/stocks/${stock.symbol}`}
                                onMouseEnter={() => setHoveredStock(stock)}
                                onMouseLeave={() => setHoveredStock(null)}
                                className={`relative rounded-2xl border p-3 flex flex-col justify-between transition-all duration-200 hover:scale-[1.03] hover:z-20 cursor-pointer shadow-md ${style.bg} ${spanClass}`}
                            >
                                <div className="flex items-start justify-between gap-1">
                                    <div>
                                        <div className="font-mono font-extrabold text-[#F4F7FF] text-sm md:text-base leading-tight">
                                            {stock.symbol}
                                        </div>
                                        <div className="text-[10px] text-[#94A3B8] truncate max-w-[90px] hidden sm:block">
                                            {stock.name}
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-mono uppercase text-[#94A3B8] hidden md:inline-block">
                                        {stock.sector.slice(0, 4)}
                                    </span>
                                </div>

                                <div className="mt-2">
                                    <div className="font-mono font-extrabold text-xs md:text-sm tracking-tight flex items-center gap-0.5">
                                        {isPositive ? (
                                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                                        ) : (
                                            <ArrowDownRight className="h-3 w-3 shrink-0" />
                                        )}
                                        <span>
                                            {sign}
                                            {stock.percentChange.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="text-[10px] font-mono text-[#F4F7FF]/80">
                                        ${stock.price.toFixed(2)}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Floating telemetry HUD tooltip for hovered stock */}
                {hoveredStock && (
                    <div className="hidden lg:flex absolute bottom-4 left-4 z-30 pointer-events-none items-center gap-4 rounded-2xl border border-[#7C5CFF]/40 bg-[#050816]/95 px-4 py-2.5 backdrop-blur-xl shadow-2xl animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold font-mono text-[#F4F7FF]">
                                ${hoveredStock.symbol}
                            </span>
                            <span className="text-xs text-[#94A3B8]">({hoveredStock.name})</span>
                        </div>
                        <div className="h-4 w-px bg-[rgba(148,163,184,0.2)]" />
                        <div className="text-xs font-mono font-bold text-[#F4F7FF]">
                            Price: ${hoveredStock.price.toFixed(2)}
                        </div>
                        <div className="h-4 w-px bg-[rgba(148,163,184,0.2)]" />
                        <div
                            className={`text-xs font-mono font-bold ${
                                hoveredStock.percentChange >= 0 ? 'text-[#3DFFA0]' : 'text-[#FF5470]'
                            }`}
                        >
                            Change: {hoveredStock.percentChange >= 0 ? '+' : ''}
                            {hoveredStock.percentChange.toFixed(2)}% (${hoveredStock.change.toFixed(2)})
                        </div>
                        <div className="h-4 w-px bg-[rgba(148,163,184,0.2)]" />
                        <div className="text-xs text-[#35D6FF]">Sector: {hoveredStock.sector}</div>
                        <div className="h-4 w-px bg-[rgba(148,163,184,0.2)]" />
                        <div className="text-[11px] text-[#94A3B8]">
                            Cap: ${(hoveredStock.marketCap / 1000).toFixed(1)}B
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
