'use client';

import React from 'react';
import { MarketStatusInfo } from './types';
import { Clock, Globe2, RefreshCw } from 'lucide-react';

interface OverviewHeaderProps {
    marketStatus: MarketStatusInfo;
    lastUpdated: number;
    onRefresh: () => void;
    isRefreshing: boolean;
}

export function OverviewHeader({
    marketStatus,
    lastUpdated,
    onRefresh,
    isRefreshing,
}: OverviewHeaderProps) {
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date());

    const formattedTime = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
    }).format(new Date(lastUpdated));

    return (
        <div className="relative overflow-hidden rounded-3xl orbital-card p-6 md:p-8 border border-[rgba(124,92,255,0.22)] shadow-[0_0_35px_rgba(124,92,255,0.06)]">
            {/* Ambient subtle decorative background glows */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-[#35D6FF]/10 blur-3xl" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border border-[rgba(53,214,255,0.3)] bg-[#050816]/70 text-[#35D6FF]">
                            {formattedDate}
                        </span>

                        {/* Market Status Pill */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-[rgba(148,163,184,0.15)] bg-[#050816]/80 text-xs font-mono">
                            <span className="relative flex h-2 w-2">
                                <span
                                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                        marketStatus.isOpen ? 'bg-[#3DFFA0]' : 'bg-amber-400'
                                    }`}
                                />
                                <span
                                    className={`relative inline-flex rounded-full h-2 w-2 ${
                                        marketStatus.isOpen ? 'bg-[#3DFFA0]' : 'bg-amber-400'
                                    }`}
                                />
                            </span>
                            <span
                                className={`text-[11px] font-bold ${
                                    marketStatus.isOpen ? 'text-[#3DFFA0]' : 'text-amber-300'
                                }`}
                            >
                                {marketStatus.sessionName}
                            </span>
                            <span className="text-[#94A3B8]">•</span>
                            <span className="text-[10px] text-[#94A3B8]">{marketStatus.nextEvent}</span>
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#F4F7FF]">
                        Market Overview
                    </h1>

                    <p className="text-xs md:text-sm text-[#94A3B8]">
                        Your daily view of the financial markets.
                    </p>
                </div>

                {/* Right controls: Last updated + Refresh button */}
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end text-right">
                        <div className="text-[10px] uppercase font-mono tracking-wider text-[#94A3B8]">
                            Last Updated
                        </div>
                        <div className="text-xs font-mono font-bold text-[#F4F7FF] flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#35D6FF]" />
                            {formattedTime}
                        </div>
                    </div>

                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="orbital-btn-secondary inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl"
                        title="Refresh market data"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 text-[#35D6FF] ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
