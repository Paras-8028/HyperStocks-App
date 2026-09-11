'use client';

import React from 'react';
import { RiskRadarItem } from '@/types/ai';
import { AlertOctagon, AlertTriangle, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export function RiskRadar({ className = '' }: { className?: string }) {
    const risks: RiskRadarItem[] = [
        {
            id: 'risk-1',
            category: 'concentration',
            severity: 'warning',
            title: 'Technology Sector Concentration > 42%',
            description: 'Your combined holdings and watchlist have heavy exposure to AI semiconductors and mega-cap tech. A macro multiples contraction would disproportionately affect net performance.',
            affectedSymbols: ['NVDA', 'AAPL', 'MSFT'],
            suggestedAction: 'Consider diversifying into defensive dividend healthcare (e.g. JNJ, LLY) or short-duration treasuries.',
        },
        {
            id: 'risk-2',
            category: 'volatility',
            severity: 'critical',
            title: 'Implied Volatility Surge Ahead of Fed Meeting',
            description: '30-day VIX forward curve shows backwardation. Short-term options pricing indicates heightened tail-risk expectations across the S&P 500.',
            affectedSymbols: ['SPY', 'QQQ'],
            suggestedAction: 'Review stop-loss levels and ensure active price alerts are configured for high-beta holdings.',
        },
        {
            id: 'risk-3',
            category: 'sentiment',
            severity: 'advisory',
            title: 'Energy Sector Regulatory & Pricing Drag',
            description: 'Negative sentiment score (-0.45) across fossil fuel producers due to international supply additions and refinery utilization cuts.',
            affectedSymbols: ['XOM', 'CVX'],
            suggestedAction: 'Hold back on fresh long entries until crude inventories show inventory draw stabilization.',
        },
    ];

    const severityConfig: Record<RiskRadarItem['severity'], { border: string; bg: string; text: string; icon: any }> = {
        critical: {
            border: 'border-rose-500/30',
            bg: 'bg-rose-950/20',
            text: 'text-rose-400',
            icon: AlertOctagon,
        },
        warning: {
            border: 'border-amber-500/30',
            bg: 'bg-amber-950/20',
            text: 'text-amber-400',
            icon: AlertTriangle,
        },
        advisory: {
            border: 'border-blue-500/30',
            bg: 'bg-blue-950/20',
            text: 'text-blue-400',
            icon: ShieldAlert,
        },
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-rose-400" />
                        Risk & Volatility Radar
                    </h2>
                    <p className="text-xs text-gray-400">
                        Automated surveillance of portfolio exposure, volatility spikes, and downside asymmetric risks
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {risks.map((risk) => {
                    const cfg = severityConfig[risk.severity];
                    const Icon = cfg.icon;

                    return (
                        <div
                            key={risk.id}
                            className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 backdrop-blur space-y-3 shadow-lg flex flex-col justify-between`}
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text}`}
                                    >
                                        <Icon className="h-3 w-3" />
                                        {risk.severity} risk
                                    </span>
                                    <span className="text-[11px] text-gray-500 capitalize">
                                        {risk.category}
                                    </span>
                                </div>

                                <h4 className="text-sm font-bold text-gray-100 leading-snug">
                                    {risk.title}
                                </h4>

                                <p className="text-xs text-gray-300 leading-relaxed">
                                    {risk.description}
                                </p>

                                {risk.affectedSymbols && risk.affectedSymbols.length > 0 && (
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <span className="text-[11px] text-gray-400">Exposed Tickers:</span>
                                        {risk.affectedSymbols.map((sym) => (
                                            <Link
                                                key={sym}
                                                href={`/stocks/${sym}`}
                                                className="text-[11px] font-bold text-gray-200 hover:text-emerald-400 px-1.5 py-0.5 bg-gray-800 rounded"
                                            >
                                                {sym}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {risk.suggestedAction && (
                                <div className="pt-2.5 border-t border-gray-800/80 text-xs">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                        Recommended Action:
                                    </div>
                                    <p className="text-[11px] text-gray-300 leading-snug">
                                        {risk.suggestedAction}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
