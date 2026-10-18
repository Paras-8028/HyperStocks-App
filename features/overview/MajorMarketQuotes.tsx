'use client';

import React from 'react';
import Link from 'next/link';
import { MajorQuoteItem } from './types';
import { ArrowDownRight, ArrowUpRight, BarChart2 } from 'lucide-react';

interface MajorMarketQuotesProps {
    quotes: MajorQuoteItem[];
}

export function MajorMarketQuotes({ quotes }: MajorMarketQuotesProps) {
    if (!quotes || quotes.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-[#F4F7FF] flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-[#35D6FF]" />
                        <span>Major Market Quotes</span>
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                        High-liquidity benchmark equities & indices.
                    </p>
                </div>
                <span className="text-[10px] font-mono text-[#35D6FF] bg-[#35D6FF]/10 px-2 py-0.5 rounded-full border border-[#35D6FF]/30">
                    Live Telemetry
                </span>
            </div>

            <div className="rounded-3xl orbital-card border border-[rgba(148,163,184,0.14)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-[rgba(148,163,184,0.12)] bg-[#080D1B]/70 text-[#94A3B8] font-mono uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-4">Instrument</th>
                                <th className="py-3 px-4">Symbol</th>
                                <th className="py-3 px-4 text-right">Last Price</th>
                                <th className="py-3 px-4 text-right">Change</th>
                                <th className="py-3 px-4 text-right">Change %</th>
                                <th className="py-3 px-4 text-right hidden sm:table-cell">Day High / Low</th>
                                <th className="py-3 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(148,163,184,0.08)]">
                            {quotes.map((q) => {
                                const isPositive = q.percentChange >= 0;
                                const sign = isPositive ? '+' : '';

                                return (
                                    <tr
                                        key={q.symbol}
                                        className="hover:bg-[#111B2E]/60 transition-colors group cursor-pointer"
                                    >
                                        <td className="py-3 px-4">
                                            <Link
                                                href={`/stocks/${q.symbol}`}
                                                className="font-bold text-[#F4F7FF] group-hover:text-[#35D6FF] transition-colors block"
                                            >
                                                {q.name}
                                            </Link>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Link
                                                href={`/stocks/${q.symbol}`}
                                                className="font-mono font-bold text-[#35D6FF] bg-[#111B2E] px-2 py-0.5 rounded border border-[rgba(148,163,184,0.12)] inline-block"
                                            >
                                                ${q.symbol}
                                            </Link>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-[#F4F7FF]">
                                            ${q.price.toFixed(2)}
                                        </td>
                                        <td
                                            className={`py-3 px-4 text-right font-mono font-semibold ${
                                                isPositive ? 'text-[#3DFFA0]' : 'text-[#FF5470]'
                                            }`}
                                        >
                                            {sign}
                                            {q.change.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span
                                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-mono font-bold text-[11px] border ${
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
                                                {sign}
                                                {q.percentChange.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-[#94A3B8] hidden sm:table-cell">
                                            ${q.highPrice?.toFixed(2)} / ${q.lowPrice?.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#3DFFA0]">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[#3DFFA0] animate-pulse" />
                                                Active
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
