'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Activity,
    ArrowUpDown,
    BookmarkCheck,
    Compass,
    ExternalLink,
    Filter,
    RefreshCw,
    Search,
    TrendingDown,
    TrendingUp,
    Trash2,
    X,
} from 'lucide-react';
import { removeFromWatchlist } from '@/lib/actions/watchlist.actions';
import { toast } from 'sonner';

export interface WatchlistTableItem {
    id?: string;
    symbol: string;
    company: string;
    addedAt?: string | null;
}

interface QuoteData {
    symbol: string;
    currentPrice: number;
    change: number;
    percentChange: number;
    highPrice?: number;
    lowPrice?: number;
    openPrice?: number;
    previousClose?: number;
    timestamp?: number;
}

interface WatchlistTableProps {
    items: WatchlistTableItem[];
    initialQuotes?: Record<string, QuoteData>;
}

type SortField = 'symbol' | 'company' | 'price' | 'change';
type SortOrder = 'asc' | 'desc';
type MovementFilter = 'all' | 'gainers' | 'losers';

// Deterministic micro-sparkline generator for smooth 60fps trend visualization
function generateTrendPoints(current: number, changePercent: number): number[] {
    const isUp = changePercent >= 0;
    const points: number[] = [];
    const count = 10;
    const range = Math.abs(current * (changePercent / 100)) || current * 0.01;
    const start = isUp ? current - range : current + range;

    for (let i = 0; i < count; i++) {
        const progress = i / (count - 1);
        const baseline = start + (current - start) * progress;
        const noise = Math.sin(i * 1.7 + current) * (range * 0.2);
        points.push(Number((baseline + (i === count - 1 ? 0 : noise)).toFixed(2)));
    }
    return points;
}

// Compact SVG MiniSparkline
function MiniSparkline({
    points,
    isPositive,
}: {
    points: number[];
    isPositive: boolean;
}) {
    if (!points || points.length < 2) return null;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 84;
    const height = 28;
    const padding = 2;

    const coords = points.map((val, idx) => {
        const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((val - min) / range) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${coords.join(' L ')}`;
    const strokeColor = isPositive ? '#3DFFA0' : '#FF5470';
    const gradientId = `wl-spark-${isPositive ? 'up' : 'down'}-${Math.abs(points[0]).toFixed(0)}-${points.length}`;

    return (
        <svg
            width={width}
            height={height}
            className="overflow-visible"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                </linearGradient>
            </defs>
            <path
                d={`${pathD} L ${width - padding},${height} L ${padding},${height} Z`}
                fill={`url(#${gradientId})`}
            />
            <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function WatchlistTable({
    items,
    initialQuotes = {},
}: WatchlistTableProps) {
    const [rows, setRows] = useState<WatchlistTableItem[]>(items);
    const [quotes, setQuotes] = useState<Record<string, QuoteData>>(initialQuotes);
    const [searchQuery, setSearchQuery] = useState('');
    const [movementFilter, setMovementFilter] = useState<MovementFilter>('all');
    const [sortField, setSortField] = useState<SortField>('symbol');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    // Sync with upstream prop changes
    useEffect(() => {
        setRows(items);
    }, [items]);

    // Handle removing a stock
    const handleRemove = async (symbol: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const prevRows = [...rows];
        setRows((prev) => prev.filter((r) => r.symbol !== symbol));

        try {
            await removeFromWatchlist(symbol);
            toast.success(`Removed $${symbol} from your watchlist`);
        } catch {
            // Revert state upon failure
            setRows(prevRows);
            toast.error(`Failed to remove $${symbol}`);
        }
    };

    // Calculate Summary Metrics accurately based on available market data
    const summaryMetrics = useMemo(() => {
        const total = rows.length;
        let upCount = 0;
        let downCount = 0;
        let totalPercentChange = 0;
        let quotedCount = 0;

        let bestStock: { symbol: string; percent: number } | null = null;
        let worstStock: { symbol: string; percent: number } | null = null;

        rows.forEach((item) => {
            const q = quotes[item.symbol];
            if (q && typeof q.percentChange === 'number') {
                quotedCount++;
                totalPercentChange += q.percentChange;

                if (q.percentChange > 0) upCount++;
                else if (q.percentChange < 0) downCount++;

                if (!bestStock || q.percentChange > bestStock.percent) {
                    bestStock = { symbol: item.symbol, percent: q.percentChange };
                }
                if (!worstStock || q.percentChange < worstStock.percent) {
                    worstStock = { symbol: item.symbol, percent: q.percentChange };
                }
            }
        });

        const avgPercent = quotedCount > 0 ? totalPercentChange / quotedCount : 0;

        return {
            total,
            upCount,
            downCount,
            avgPercent,
            quotedCount,
            bestStock,
            worstStock,
        };
    }, [rows, quotes]);

    // Filter and Sort rows
    const filteredRows = useMemo(() => {
        let result = [...rows];

        // 1. Search Query filter
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            result = result.filter(
                (item) =>
                    item.symbol.toLowerCase().includes(query) ||
                    item.company.toLowerCase().includes(query)
            );
        }

        // 2. Movement Filter (all, gainers, losers)
        if (movementFilter === 'gainers') {
            result = result.filter((item) => {
                const q = quotes[item.symbol];
                return q && q.percentChange > 0;
            });
        } else if (movementFilter === 'losers') {
            result = result.filter((item) => {
                const q = quotes[item.symbol];
                return q && q.percentChange < 0;
            });
        }

        // 3. Sorting
        result.sort((a, b) => {
            const quoteA = quotes[a.symbol];
            const quoteB = quotes[b.symbol];

            let comparison = 0;

            if (sortField === 'symbol') {
                comparison = a.symbol.localeCompare(b.symbol);
            } else if (sortField === 'company') {
                comparison = a.company.localeCompare(b.company);
            } else if (sortField === 'price') {
                const priceA = quoteA?.currentPrice ?? 0;
                const priceB = quoteB?.currentPrice ?? 0;
                comparison = priceA - priceB;
            } else if (sortField === 'change') {
                const changeA = quoteA?.percentChange ?? 0;
                const changeB = quoteB?.percentChange ?? 0;
                comparison = changeA - changeB;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [rows, quotes, searchQuery, movementFilter, sortField, sortOrder]);

    const handleSortToggle = (field: SortField) => {
        if (sortField === field) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder(field === 'price' || field === 'change' ? 'desc' : 'asc');
        }
    };

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-3xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/60 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111B2E] border border-[rgba(148,163,184,0.18)] text-[#35D6FF] mb-4 shadow-[0_0_25px_rgba(53,214,255,0.15)]">
                    <BookmarkCheck className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-[#F4F7FF] mb-1">
                    Your Watchlist is Empty
                </h3>
                <p className="text-xs text-[#94A3B8] max-w-md mb-6 leading-relaxed">
                    Track your favorite equities, monitor price spikes, and receive real-time financial telemetry.
                </p>
                <Link
                    href="/stocks"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-[#050816] font-bold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(124,92,255,0.3)] transition-all"
                >
                    <Compass className="h-4 w-4" />
                    <span>Explore Stocks</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 1. Summary Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Tracked */}
                <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/80 p-4 backdrop-blur shadow-sm hover:border-[#7C5CFF]/30 transition">
                    <div className="flex items-center justify-between text-[#94A3B8] text-xs mb-1.5">
                        <span>Tracked Assets</span>
                        <BookmarkCheck className="h-4 w-4 text-[#7C5CFF]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#F4F7FF] font-mono tabular-nums">
                        {summaryMetrics.total}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-1">
                        Active Watchlist Symbols
                    </div>
                </div>

                {/* Advancers */}
                <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/80 p-4 backdrop-blur shadow-sm hover:border-[#3DFFA0]/30 transition">
                    <div className="flex items-center justify-between text-[#94A3B8] text-xs mb-1.5">
                        <span>Advancing</span>
                        <TrendingUp className="h-4 w-4 text-[#3DFFA0]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#3DFFA0] font-mono tabular-nums">
                        {summaryMetrics.upCount}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-1">
                        Stocks Gaining Today
                    </div>
                </div>

                {/* Decliners */}
                <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/80 p-4 backdrop-blur shadow-sm hover:border-[#FF5470]/30 transition">
                    <div className="flex items-center justify-between text-[#94A3B8] text-xs mb-1.5">
                        <span>Declining</span>
                        <TrendingDown className="h-4 w-4 text-[#FF5470]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#FF5470] font-mono tabular-nums">
                        {summaryMetrics.downCount}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-1">
                        Stocks Lower Today
                    </div>
                </div>

                {/* Day Momentum (Watchlist Avg Move) */}
                <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/80 p-4 backdrop-blur shadow-sm hover:border-[#35D6FF]/30 transition">
                    <div className="flex items-center justify-between text-[#94A3B8] text-xs mb-1.5">
                        <span>Day Momentum</span>
                        <Activity className="h-4 w-4 text-[#35D6FF]" />
                    </div>
                    <div
                        className={`text-2xl font-extrabold font-mono tabular-nums ${
                            summaryMetrics.avgPercent > 0
                                ? 'text-[#3DFFA0]'
                                : summaryMetrics.avgPercent < 0
                                ? 'text-[#FF5470]'
                                : 'text-[#F4F7FF]'
                        }`}
                    >
                        {summaryMetrics.avgPercent > 0 ? '+' : ''}
                        {summaryMetrics.avgPercent.toFixed(2)}%
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-1">
                        Average Watchlist Daily Move
                    </div>
                </div>
            </div>

            {/* 2. Search, Filter, and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#080D1B]/70 border border-[rgba(148,163,184,0.14)] p-3 rounded-2xl">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search symbols or companies..."
                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#111B2E] border border-[rgba(148,163,184,0.16)] text-xs text-[#F4F7FF] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7C5CFF] transition"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F4F7FF]"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter and Sort Group */}
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
                    {/* Filter Pills */}
                    <div className="flex p-0.5 bg-[#111B2E] rounded-xl border border-[rgba(148,163,184,0.16)]">
                        <button
                            type="button"
                            onClick={() => setMovementFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                movementFilter === 'all'
                                    ? 'bg-[#7C5CFF] text-[#F4F7FF] shadow-sm'
                                    : 'text-[#94A3B8] hover:text-[#F4F7FF]'
                            }`}
                        >
                            All ({rows.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setMovementFilter('gainers')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                movementFilter === 'gainers'
                                    ? 'bg-[#3DFFA0]/20 text-[#3DFFA0] border border-[#3DFFA0]/40'
                                    : 'text-[#94A3B8] hover:text-[#F4F7FF]'
                            }`}
                        >
                            Gainers ({summaryMetrics.upCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setMovementFilter('losers')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                movementFilter === 'losers'
                                    ? 'bg-[#FF5470]/20 text-[#FF5470] border border-[#FF5470]/40'
                                    : 'text-[#94A3B8] hover:text-[#F4F7FF]'
                            }`}
                        >
                            Losers ({summaryMetrics.downCount})
                        </button>
                    </div>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={`${sortField}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                                setSortField(field);
                                setSortOrder(order);
                            }}
                            className="bg-[#111B2E] border border-[rgba(148,163,184,0.16)] text-xs text-[#F4F7FF] rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#7C5CFF]"
                        >
                            <option value="symbol-asc">Symbol (A-Z)</option>
                            <option value="symbol-desc">Symbol (Z-A)</option>
                            <option value="company-asc">Company (A-Z)</option>
                            <option value="price-desc">Price (Highest)</option>
                            <option value="price-asc">Price (Lowest)</option>
                            <option value="change-desc">24h Gainers</option>
                            <option value="change-asc">24h Decliners</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. Empty Search / Filter Fallback */}
            {filteredRows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/40 text-center">
                    <Filter className="h-8 w-8 text-[#94A3B8] mb-2" />
                    <h4 className="text-sm font-bold text-[#F4F7FF]">No matching stocks</h4>
                    <p className="text-xs text-[#94A3B8] mt-1 mb-4">
                        No stocks in your watchlist match &quot;{searchQuery}&quot; with the current filter.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery('');
                            setMovementFilter('all');
                        }}
                        className="px-4 py-1.5 rounded-xl bg-[#111B2E] border border-[rgba(148,163,184,0.18)] hover:border-[#7C5CFF] text-xs font-semibold text-[#F4F7FF] transition"
                    >
                        Clear Filters
                    </button>
                </div>
            )}

            {/* 4. Desktop Stock Table (Hidden on Mobile) */}
            {filteredRows.length > 0 && (
                <div className="hidden md:block rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/90 backdrop-blur overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[rgba(148,163,184,0.14)] bg-[#080D1B]/80 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                                <th
                                    className="py-3.5 px-4 cursor-pointer hover:text-[#F4F7FF] transition"
                                    onClick={() => handleSortToggle('symbol')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Stock</span>
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th
                                    className="py-3.5 px-4 text-right cursor-pointer hover:text-[#F4F7FF] transition"
                                    onClick={() => handleSortToggle('price')}
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span>Last Price</span>
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th
                                    className="py-3.5 px-4 text-right cursor-pointer hover:text-[#F4F7FF] transition"
                                    onClick={() => handleSortToggle('change')}
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span>24h Change</span>
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="py-3.5 px-4 text-center">Trend</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(148,163,184,0.08)] text-xs">
                            {filteredRows.map((item) => {
                                const quote = quotes[item.symbol];
                                const hasPrice = quote && typeof quote.currentPrice === 'number' && quote.currentPrice > 0;
                                const isPositive = (quote?.percentChange ?? 0) >= 0;
                                const trendPoints = hasPrice
                                    ? generateTrendPoints(quote.currentPrice, quote.percentChange)
                                    : [];

                                return (
                                    <tr
                                        key={item.symbol}
                                        onClick={() => router.push(`/stocks/${item.symbol}`)}
                                        className="group hover:bg-[#111B2E]/60 transition-colors duration-150 cursor-pointer"
                                    >
                                        {/* Stock Logo, Symbol & Company */}
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                {/* Fallback stylized avatar icon with gradient border */}
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#111B2E] to-[#080D1B] border border-[#7C5CFF]/30 font-bold font-mono text-xs text-[#35D6FF] shadow-inner group-hover:border-[#35D6FF]/60 transition">
                                                    {item.symbol.slice(0, 3)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#F4F7FF] text-sm tracking-wide group-hover:text-[#35D6FF] transition flex items-center gap-1.5">
                                                        ${item.symbol}
                                                    </span>
                                                    <span className="text-[11px] text-[#94A3B8] truncate max-w-[200px]">
                                                        {item.company}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Latest Price */}
                                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-sm tabular-nums text-[#F4F7FF]">
                                            {hasPrice ? `$${quote.currentPrice.toFixed(2)}` : (
                                                <span className="text-[#94A3B8] font-normal text-xs">Unavailable</span>
                                            )}
                                        </td>

                                        {/* Absolute & Percentage Daily Change */}
                                        <td className="py-3.5 px-4 text-right">
                                            {hasPrice ? (
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span
                                                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-mono font-bold border tabular-nums ${
                                                            isPositive
                                                                ? 'text-[#3DFFA0] bg-[#3DFFA0]/10 border-[#3DFFA0]/30'
                                                                : 'text-[#FF5470] bg-[#FF5470]/10 border-[#FF5470]/30'
                                                        }`}
                                                    >
                                                        {isPositive ? '+' : ''}
                                                        {quote.percentChange.toFixed(2)}%
                                                    </span>
                                                    <span className="text-[10px] font-mono text-[#94A3B8] tabular-nums">
                                                        {quote.change >= 0 ? '+' : ''}
                                                        ${quote.change.toFixed(2)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-[#94A3B8]">—</span>
                                            )}
                                        </td>

                                        {/* Mini Price Trend Chart */}
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center justify-center">
                                                {trendPoints.length > 0 ? (
                                                    <MiniSparkline
                                                        points={trendPoints}
                                                        isPositive={isPositive}
                                                    />
                                                ) : (
                                                    <span className="text-[11px] text-[#94A3B8]">No trend</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Quick Actions (Analyze & Remove) */}
                                        <td className="py-3.5 px-4 text-right">
                                            <div
                                                className="flex items-center justify-end gap-2"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Link
                                                    href={`/stocks/${item.symbol}`}
                                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#35D6FF] hover:text-[#3DFFA0] bg-[#111B2E] border border-[rgba(148,163,184,0.18)] hover:border-[#35D6FF]/50 transition"
                                                    title="View stock intelligence"
                                                >
                                                    Analyze
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleRemove(item.symbol, e)}
                                                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#FF5470] hover:bg-[#FF5470]/10 border border-transparent hover:border-[#FF5470]/30 transition"
                                                    title={`Remove $${item.symbol} from watchlist`}
                                                    aria-label={`Remove ${item.symbol}`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 5. Responsive Mobile Stock Cards (Visible on Mobile only) */}
            {filteredRows.length > 0 && (
                <div className="block md:hidden space-y-3">
                    {filteredRows.map((item) => {
                        const quote = quotes[item.symbol];
                        const hasPrice = quote && typeof quote.currentPrice === 'number' && quote.currentPrice > 0;
                        const isPositive = (quote?.percentChange ?? 0) >= 0;
                        const trendPoints = hasPrice
                            ? generateTrendPoints(quote.currentPrice, quote.percentChange)
                            : [];

                        return (
                            <div
                                key={item.symbol}
                                onClick={() => router.push(`/stocks/${item.symbol}`)}
                                className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/90 p-4 space-y-3 shadow-lg active:scale-[0.99] transition cursor-pointer"
                            >
                                {/* Top: Symbol, Company & Actions */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#111B2E] border border-[#7C5CFF]/30 font-bold font-mono text-xs text-[#35D6FF]">
                                            {item.symbol.slice(0, 3)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#F4F7FF] text-sm">
                                                ${item.symbol}
                                            </div>
                                            <div className="text-[11px] text-[#94A3B8] truncate max-w-[170px]">
                                                {item.company}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="flex items-center gap-1.5"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Link
                                            href={`/stocks/${item.symbol}`}
                                            className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#35D6FF] bg-[#111B2E] border border-[rgba(148,163,184,0.16)]"
                                        >
                                            Analyze
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={(e) => handleRemove(item.symbol, e)}
                                            className="p-1.5 text-[#94A3B8] hover:text-[#FF5470] rounded-lg"
                                            aria-label={`Remove ${item.symbol}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Bottom: Price, Change pill & Sparkline */}
                                <div className="flex items-center justify-between pt-2 border-t border-[rgba(148,163,184,0.08)]">
                                    <div>
                                        <div className="text-base font-extrabold font-mono text-[#F4F7FF] tabular-nums">
                                            {hasPrice ? `$${quote.currentPrice.toFixed(2)}` : '—'}
                                        </div>
                                        {hasPrice && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span
                                                    className={`text-[10px] font-mono font-bold ${
                                                        isPositive ? 'text-[#3DFFA0]' : 'text-[#FF5470]'
                                                    }`}
                                                >
                                                    {isPositive ? '+' : ''}
                                                    {quote.percentChange.toFixed(2)}%
                                                </span>
                                                <span className="text-[10px] font-mono text-[#94A3B8]">
                                                    ({quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)})
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {trendPoints.length > 0 && (
                                        <MiniSparkline
                                            points={trendPoints}
                                            isPositive={isPositive}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
