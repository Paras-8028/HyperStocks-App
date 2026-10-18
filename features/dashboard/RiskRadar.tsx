'use client';

import React, { useState, useEffect } from 'react';
import { usePersonalization } from '@/context/PersonalizationContext';
import { RiskRadarItem } from '@/types/ai';
import {
    AlertOctagon,
    AlertTriangle,
    ArrowRight,
    Shield,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

export function RiskRadar({ className = '' }: { className?: string }) {
    const { preferences } = usePersonalization();
    const [risks, setRisks] = useState<RiskRadarItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        fetch('/api/personalization/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                preferences,
                watchlistSymbols: preferences.favoriteStocks || [],
            }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (isMounted && data.success && data.data?.risks) {
                    setRisks(data.data.risks);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [preferences]);

    const severityConfig: Record<RiskRadarItem['severity'], { border: string; bg: string; text: string; icon: any }> = {
        critical: {
            border: 'border-[#FF5470]/30',
            bg: 'bg-[#FF5470]/10',
            text: 'text-[#FF5470]',
            icon: AlertOctagon,
        },
        warning: {
            border: 'border-amber-400/30',
            bg: 'bg-amber-400/10',
            text: 'text-amber-300',
            icon: AlertTriangle,
        },
        advisory: {
            border: 'border-[#35D6FF]/30',
            bg: 'bg-[#35D6FF]/10',
            text: 'text-[#35D6FF]',
            icon: ShieldAlert,
        },
    };

    const isConservative = preferences.riskTolerance === 'conservative' || preferences.riskTolerance === 'Low';

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-[#F4F7FF] flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-300" />
                        <span>AI Risk Radar & Exposure Matrix</span>
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                        Evaluated under a{' '}
                        <span className="text-amber-300 font-semibold">{preferences.riskTolerance}</span> risk profile
                        {isConservative && ' (High Sensitivity Capital Defense Active)'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-[#94A3B8]">
                        Profile Sensitivity:{' '}
                        <span className={`font-semibold ${isConservative ? 'text-[#FF5470]' : 'text-[#3DFFA0]'}`}>
                            {isConservative ? 'Capital Preservation' : 'Balanced Growth'}
                        </span>
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {risks.slice(0, 3).map((risk) => {
                    const cfg = severityConfig[risk.severity] || severityConfig.warning;
                    const Icon = cfg.icon;

                    return (
                        <div
                            key={risk.id}
                            className={`orbital-card orbital-card-interactive flex flex-col justify-between p-5 space-y-4 border ${cfg.border}`}
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`h-4 w-4 ${cfg.text}`} />
                                        <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>
                                            {risk.category} Risk
                                        </span>
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text}`}
                                    >
                                        {risk.severity}
                                    </span>
                                </div>

                                <h3 className="text-sm font-bold text-[#F4F7FF] leading-snug">
                                    {risk.title}
                                </h3>

                                <p className="text-xs text-[#94A3B8] leading-relaxed font-normal">
                                    {risk.description}
                                </p>

                                {risk.affectedSymbols && risk.affectedSymbols.length > 0 && (
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <span className="text-[11px] text-[#94A3B8]">Affected:</span>
                                        {risk.affectedSymbols.map((sym) => (
                                            <Link
                                                key={sym}
                                                href={`/stocks/${sym}`}
                                                className="text-[11px] font-mono font-bold text-[#F4F7FF] bg-[#111B2E] hover:bg-[#111B2E]/90 hover:text-[#35D6FF] px-2 py-0.5 rounded border border-[rgba(148,163,184,0.18)] transition"
                                            >
                                                ${sym}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {risk.suggestedAction && (
                                <div className="pt-3 border-t border-[rgba(148,163,184,0.12)] space-y-1">
                                    <div className="text-[11px] font-semibold text-[#3DFFA0]">
                                        AI Suggested Defense:
                                    </div>
                                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">
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
