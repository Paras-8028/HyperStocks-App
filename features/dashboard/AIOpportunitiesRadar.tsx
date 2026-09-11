'use client';

import React from 'react';
import { OpportunityItem } from '@/types/ai';
import { ArrowUpRight, CheckCircle2, Shield, Sparkles, Target, Zap } from 'lucide-react';
import Link from 'next/link';

export function AIOpportunitiesRadar({ className = '' }: { className?: string }) {
    const opportunities: OpportunityItem[] = [
        {
            symbol: 'AMD',
            company: 'Advanced Micro Devices',
            thesis: 'AI server accelerator market share expansion with attractive price-to-earnings growth (PEG) ratio.',
            catalyst: 'Enterprise benchmark release & new cloud hyperscaler deployment announcements.',
            metricsHighlight: 'P/E: 32.4 | Fwd Rev Growth: +28%',
            confidence: 88,
            timeframe: 'Medium Term',
            risk: 'Medium',
        },
        {
            symbol: 'LLY',
            company: 'Eli Lilly & Co.',
            thesis: 'Sustained commercial pipeline dominance in cardiometabolic therapeutics and high operating margins.',
            catalyst: 'Quarterly supply capacity expansion coming online across international distribution hubs.',
            metricsHighlight: 'Operating Margin: 34.2% | EPS +42% YoY',
            confidence: 92,
            timeframe: 'Long Term',
            risk: 'Low',
        },
        {
            symbol: 'UBER',
            company: 'Uber Technologies',
            thesis: 'Free cash flow inflection point paired with aggressive share repurchase program execution.',
            catalyst: 'Mobility take-rate stabilization and enterprise delivery advertising revenue ramp.',
            metricsHighlight: 'FCF Margin: 12.8% | Net Income +120%',
            confidence: 85,
            timeframe: 'Short Term',
            risk: 'Medium',
        },
    ];

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-400" />
                        AI Opportunities Radar
                    </h2>
                    <p className="text-xs text-gray-400">
                        Multi-factor screen evaluating momentum, fundamental margin health, and catalyst timing
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {opportunities.map((opp) => (
                    <div
                        key={opp.symbol}
                        className="flex flex-col justify-between rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-gray-900/90 to-emerald-950/10 p-5 backdrop-blur shadow-lg space-y-4 hover:border-emerald-500/40 transition"
                    >
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-gray-100">
                                            {opp.symbol}
                                        </span>
                                        <span className="text-xs text-gray-400 truncate max-w-[120px]">
                                            {opp.company}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                        Horizon: <span className="text-gray-300 font-medium">{opp.timeframe}</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                        {opp.confidence}% Score
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-300 leading-relaxed bg-gray-850/60 p-3 rounded-xl border border-gray-800">
                                {opp.thesis}
                            </p>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center gap-1.5 font-semibold text-yellow-400 text-[11px]">
                                    <Zap className="h-3 w-3" />
                                    Expected Catalyst
                                </div>
                                <p className="text-[11px] text-gray-400 leading-snug">{opp.catalyst}</p>
                            </div>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-gray-800/80">
                            <div className="text-[11px] font-mono text-gray-400 bg-gray-850 px-2.5 py-1 rounded">
                                {opp.metricsHighlight}
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    {opp.risk} Risk Profile
                                </span>
                                <Link
                                    href={`/stocks/${opp.symbol}`}
                                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                                >
                                    Explore Setup <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Regulatory Disclaimer */}
            <div className="text-[11px] text-gray-500 bg-gray-900/40 border border-gray-800/80 rounded-xl p-3 text-center italic">
                Informational analysis only. Not certified financial advice. Quantitative scoring is derived from historical data, public news, and consensus models.
            </div>
        </div>
    );
}
