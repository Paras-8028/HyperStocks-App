'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, TrendingUp, Zap, ShieldCheck, Activity } from 'lucide-react';

interface AuthBrandPanelProps {
    mode?: 'sign-in' | 'sign-up';
}

export function AuthBrandPanel({ mode = 'sign-in' }: AuthBrandPanelProps) {
    const isSignIn = mode === 'sign-in';

    const headline = isSignIn ? (
        <>
            Your market.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
                Understood by AI.
            </span>
        </>
    ) : (
        <>
            Build your personal
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
                market intelligence.
            </span>
        </>
    );

    const description = isSignIn
        ? 'Turn raw market feeds into actionable intelligence with predictive synthesis built around your portfolio, watchlist, and custom risk parameters.'
        : 'Create your HyperStocks account and unlock institutional-grade market data, probabilistic thesis generation, and real-time personalized alerts.';

    const marketTickers = [
        {
            symbol: 'NVDA',
            name: 'NVIDIA Corp.',
            price: '$128.45',
            change: '+3.84%',
            positive: true,
            signal: 'Strong Accumulation',
        },
        {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            price: '$224.12',
            change: '+1.25%',
            positive: true,
            signal: 'Ecosystem Growth',
        },
        {
            symbol: 'MSFT',
            name: 'Microsoft Corp.',
            price: '$448.90',
            change: '+2.10%',
            positive: true,
            signal: 'Cloud Momentum',
        },
    ];

    return (
        <div className="relative flex flex-col justify-between h-full p-8 lg:p-12 xl:p-16 select-none overflow-hidden">
            {/* Header: Brand Logo & AI Pill */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Link href="/" className="inline-block transition-opacity hover:opacity-90">
                        <Image
                            src="/assets/icons/L1.png"
                            alt="HyperStocks logo"
                            width={150}
                            height={34}
                            className="h-8 sm:h-9 w-auto cursor-pointer"
                            priority
                        />
                    </Link>

                    <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur-md">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                        <span>AI Engine Active</span>
                    </div>
                </div>

                {/* Hero Headline & Value Proposition */}
                <div className="pt-6 sm:pt-10 max-w-xl space-y-4">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-100 tracking-tight leading-[1.15]">
                        {headline}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-md">
                        {description}
                    </p>
                </div>
            </div>

            {/* Sophisticated Financial Intelligence Visualization */}
            <div className="my-8 lg:my-10 space-y-4 max-w-xl">
                {/* Real-time AI Catalyst Insight Card */}
                <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-emerald-950/30 p-4 sm:p-5 backdrop-blur-xl shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                            <span>HyperStocks AI Radar</span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                            94% Conviction
                        </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                        &ldquo;Cross-sector capital rotations reveal accelerating institutional inflows toward enterprise AI semiconductors. Macro volatility risk remains bounded.&rdquo;
                    </p>
                    <div className="flex items-center gap-4 pt-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-emerald-400" /> Real-time synthesis
                        </span>
                        <span className="flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-teal-400" /> Institutional grade
                        </span>
                    </div>
                </div>

                {/* Floating Illustrative Market Ticker Strip */}
                <div className="grid grid-cols-3 gap-2.5">
                    {marketTickers.map((item) => (
                        <div
                            key={item.symbol}
                            className="rounded-xl border border-gray-800/80 bg-gray-900/60 p-3 backdrop-blur-md shadow-md hover:border-gray-700/80 transition-all duration-200"
                        >
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-gray-200">{item.symbol}</span>
                                <span className="text-[11px] font-semibold text-emerald-400 flex items-center">
                                    <TrendingUp className="h-3 w-3 inline mr-0.5" />
                                    {item.change}
                                </span>
                            </div>
                            <div className="text-xs font-mono font-medium text-gray-400">{item.price}</div>
                            <div className="text-[10px] text-gray-500 mt-1 truncate">{item.signal}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Institutional Trust & Illustrative Notice Footer */}
            <div className="pt-4 border-t border-gray-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-500">
                <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Algorithmic Equity Intelligence &amp; Autonomous Signals</span>
                </div>
                <div className="italic text-gray-600 text-[10px]">
                    Illustrative interface simulation
                </div>
            </div>
        </div>
    );
}
