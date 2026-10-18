'use client';

import React, { useState, useEffect } from 'react';
import { StockQuote, StockCandlesResult } from '@/types/market';
import { DownsideRiskAssessment } from '@/types/risk';
import { DownsideRiskEngine } from '@/services/risk/DownsideRiskEngine';
import {
    Activity,
    AlertOctagon,
    AlertTriangle,
    ArrowDownRight,
    CheckCircle2,
    Clock,
    HelpCircle,
    Info,
    Shield,
    ShieldAlert,
    TrendingDown,
    Zap,
} from 'lucide-react';

interface QuantitativeRiskSectionProps {
    symbol: string;
    companyName?: string;
    quote?: StockQuote;
    initialCandles?: StockCandlesResult;
}

export function QuantitativeRiskSection({
    symbol,
    companyName,
    quote,
    initialCandles,
}: QuantitativeRiskSectionProps) {
    const [assessment, setAssessment] = useState<DownsideRiskAssessment | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function computeRisk() {
            setLoading(true);
            try {
                if (initialCandles) {
                    const result = DownsideRiskEngine.assessDownsideRisk(
                        symbol,
                        companyName || symbol,
                        initialCandles,
                        quote
                    );
                    if (isMounted) setAssessment(result);
                } else {
                    const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/risk`).catch(() => null);
                    if (res && res.ok) {
                        const json = await res.json();
                        if (json?.assessment && isMounted) {
                            setAssessment(json.assessment);
                        }
                    }
                }
            } catch (err) {
                console.warn('[QuantitativeRiskSection] Failed assessing downside risk:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        computeRisk();

        return () => {
            isMounted = false;
        };
    }, [symbol, companyName, quote, initialCandles]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-[rgba(124,92,255,0.2)] bg-[#090D22]/80 p-6 backdrop-blur space-y-3 animate-pulse">
                <div className="h-4 w-48 bg-gray-800 rounded"></div>
                <div className="h-20 bg-gray-900 rounded-xl"></div>
            </div>
        );
    }

    if (!assessment) return null;

    const severityConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
        critical: {
            label: 'High Downside Volatility',
            bg: 'bg-rose-500/10',
            text: 'text-rose-400',
            border: 'border-rose-500/30',
        },
        warning: {
            label: 'Elevated Risk',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
            border: 'border-amber-500/30',
        },
        advisory: {
            label: 'Informational',
            bg: 'bg-cyan-500/10',
            text: 'text-cyan-400',
            border: 'border-cyan-500/30',
        },
        low: {
            label: 'Controlled Baseline',
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            border: 'border-emerald-500/30',
        },
    };

    const currentSeverity = severityConfig[assessment.overallRiskSeverity] || severityConfig.low;

    return (
        <div className="rounded-2xl border border-[rgba(124,92,255,0.25)] bg-[#090D22]/90 p-6 backdrop-blur space-y-6 shadow-xl text-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(124,92,255,0.15)] pb-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#7C5CFF]/15 text-[#35D6FF] border border-[#7C5CFF]/30">
                        <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                            Quantitative Downside-Risk Engine
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C5CFF]/20 text-[#35D6FF] font-medium border border-[#7C5CFF]/30">
                                Empirical Observations
                            </span>
                        </h2>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            Data Window: {assessment.dataFreshness} &bull; Engine v{assessment.calculationVersion}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${currentSeverity.bg} ${currentSeverity.text} ${currentSeverity.border}`}
                    >
                        {currentSeverity.label}
                    </span>
                </div>
            </div>

            {/* Triggered Conditions Alert Box */}
            {assessment.triggeredConditions.length > 0 ? (
                <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        Triggered Risk Conditions ({assessment.triggeredConditions.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {assessment.triggeredConditions.map((c, idx) => (
                            <div
                                key={idx}
                                className={`rounded-xl border p-3.5 space-y-1.5 ${
                                    c.severity === 'critical'
                                        ? 'bg-rose-950/20 border-rose-500/30'
                                        : 'bg-[#0D1226] border-[rgba(124,92,255,0.25)]'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-white text-xs">{c.title}</span>
                                    <span
                                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                            c.severity === 'critical'
                                                ? 'bg-rose-500/20 text-rose-400'
                                                : 'bg-amber-500/20 text-amber-400'
                                        }`}
                                    >
                                        {c.severity}
                                    </span>
                                </div>
                                <p className="text-gray-300 text-[11px] leading-relaxed">{c.evidence}</p>
                                <div className="text-[10px] text-gray-400 pt-1 flex items-center justify-between border-t border-gray-800/60">
                                    <span>
                                        <strong className="text-gray-300">Window:</strong> {c.observationWindow}
                                    </span>
                                    <span>
                                        <strong className="text-gray-300">Threshold:</strong> {c.thresholdApplied}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="font-bold text-emerald-300 text-xs">No Active Downside Conditions</p>
                        <p className="text-gray-400 text-[11px]">
                            {symbol} is operating within normal baseline volatility, moving average support, and historical drawdowns.
                        </p>
                    </div>
                </div>
            )}

            {/* Key Indicators 6-Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* 1. 95% Daily VaR */}
                <div className="p-3.5 rounded-xl bg-[#050816] border border-gray-800/80 space-y-1 relative">
                    <div className="flex items-center justify-between text-gray-400 text-[11px]">
                        <span>95% Daily VaR</span>
                        <HelpCircle
                            className="h-3 w-3 cursor-pointer hover:text-white"
                            onClick={() => setActiveTooltip(activeTooltip === 'var' ? null : 'var')}
                        />
                    </div>
                    <div className="text-base font-bold text-white">
                        {assessment.historicalVaR95.displayValue}
                    </div>
                    <div className="text-[10px] text-gray-500">
                        Window: {assessment.historicalVaR95.observationWindow}
                    </div>
                    {activeTooltip === 'var' && (
                        <div className="absolute z-10 bottom-full left-0 mb-2 p-2.5 rounded-lg bg-gray-900 border border-gray-700 text-[10px] text-gray-300 shadow-xl w-60">
                            {assessment.historicalVaR95.explanation}
                            <p className="text-amber-400 mt-1 font-semibold">{assessment.historicalVaR95.limitations}</p>
                        </div>
                    )}
                </div>

                {/* 2. 95% CVaR */}
                <div className="p-3.5 rounded-xl bg-[#050816] border border-gray-800/80 space-y-1 relative">
                    <div className="flex items-center justify-between text-gray-400 text-[11px]">
                        <span>95% CVaR (Tail)</span>
                        <HelpCircle
                            className="h-3 w-3 cursor-pointer hover:text-white"
                            onClick={() => setActiveTooltip(activeTooltip === 'cvar' ? null : 'cvar')}
                        />
                    </div>
                    <div className="text-base font-bold text-white">
                        {assessment.historicalCVaR95.displayValue}
                    </div>
                    <div className="text-[10px] text-gray-500">
                        Expected shortfall beyond 95%
                    </div>
                    {activeTooltip === 'cvar' && (
                        <div className="absolute z-10 bottom-full left-0 mb-2 p-2.5 rounded-lg bg-gray-900 border border-gray-700 text-[10px] text-gray-300 shadow-xl w-60">
                            {assessment.historicalCVaR95.explanation}
                        </div>
                    )}
                </div>

                {/* 3. Maximum Drawdown */}
                <div className="p-3.5 rounded-xl bg-[#050816] border border-gray-800/80 space-y-1">
                    <span className="text-gray-400 text-[11px] block">Max Drawdown</span>
                    <div className="text-base font-bold text-rose-400">
                        {assessment.maximumDrawdown.displayValue}
                    </div>
                    <div className="text-[10px] text-gray-500">
                        Window: {assessment.maximumDrawdown.observationWindow}
                    </div>
                </div>

                {/* 4. 21-Day Volatility */}
                <div className="p-3.5 rounded-xl bg-[#050816] border border-gray-800/80 space-y-1">
                    <span className="text-gray-400 text-[11px] block">21d Volatility</span>
                    <div className="text-base font-bold text-white">
                        {assessment.historicalVolatility21d.displayValue}
                    </div>
                    <div className="text-[10px] text-gray-500">
                        Annualized std deviation
                    </div>
                </div>

                {/* 5. Moving Average Status */}
                <div className="p-3.5 rounded-xl bg-[#050816] border border-gray-800/80 space-y-1">
                    <span className="text-gray-400 text-[11px] block">Trend MA Support</span>
                    <div className={`text-xs font-bold truncate ${
                        assessment.movingAverageBreakdown.value?.isBreakdown ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                        {assessment.movingAverageBreakdown.displayValue}
                    </div>
                    <div className="text-[10px] text-gray-500">
                        {assessment.movingAverageBreakdown.observationWindow}
                    </div>
                </div>

                {/* 6. Volatility Expansion */}
                <div className="p-3.5 rounded-xl bg-[#050816] border border-gray-800/80 space-y-1">
                    <span className="text-gray-400 text-[11px] block">Vol Expansion</span>
                    <div className={`text-xs font-bold truncate ${
                        assessment.volatilityExpansion.value?.isExpanding ? 'text-rose-400' : 'text-gray-200'
                    }`}>
                        {assessment.volatilityExpansion.displayValue}
                    </div>
                    <div className="text-[10px] text-gray-500">
                        21d short vs 63d base
                    </div>
                </div>
            </div>

            {/* Transparent Methodology & Disclaimer */}
            <div className="p-3.5 rounded-xl bg-[#050816]/70 border border-gray-800/60 text-[11px] text-gray-400 space-y-1">
                <p className="font-semibold text-gray-300">
                    Methodology & Limitations Notice:
                </p>
                <p className="text-[10px] leading-relaxed text-gray-400">
                    All indicators shown are backward-looking empirical observations derived from historical market prices. They do not constitute an 80% or calibrated future downside probability, price target, or investment advice. Historical tail losses do not guarantee future loss bounds.
                </p>
            </div>
        </div>
    );
}
