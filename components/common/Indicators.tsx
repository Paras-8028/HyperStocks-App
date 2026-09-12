'use client';

import React from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    Info,
    ShieldAlert,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

// ==========================================
// 1. SENTIMENT INDICATOR
// ==========================================
export type SentimentType = 'positive' | 'neutral' | 'negative' | 'bullish' | 'bearish';

export interface SentimentIndicatorProps {
    sentiment: SentimentType;
    score?: number;
    size?: 'sm' | 'md';
    className?: string;
}

export function SentimentIndicator({
    sentiment,
    score,
    size = 'sm',
    className = '',
}: SentimentIndicatorProps) {
    const isBull = sentiment === 'positive' || sentiment === 'bullish';
    const isBear = sentiment === 'negative' || sentiment === 'bearish';

    const colorClasses = isBull
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : isBear
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        : 'bg-gray-800 text-gray-300 border-gray-700';

    const sizeClasses =
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs font-bold';

    const label = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full font-bold border ${colorClasses} ${sizeClasses} ${className}`}
        >
            {isBull ? (
                <TrendingUp className="h-3 w-3 shrink-0" />
            ) : isBear ? (
                <TrendingDown className="h-3 w-3 shrink-0" />
            ) : (
                <Activity className="h-3 w-3 shrink-0" />
            )}
            <span>{label}</span>
            {typeof score === 'number' && (
                <span className="font-mono text-[9px] opacity-80">
                    ({score > 0 ? '+' : ''}
                    {score.toFixed(1)})
                </span>
            )}
        </span>
    );
}

// ==========================================
// 2. RISK & SEVERITY BADGE
// ==========================================
export type RiskSeverity = 'critical' | 'warning' | 'info' | 'advisory' | 'high' | 'moderate' | 'low';

export interface RiskBadgeProps {
    severity: RiskSeverity;
    label?: string;
    className?: string;
}

export function RiskBadge({ severity, label, className = '' }: RiskBadgeProps) {
    const sev = severity.toLowerCase();

    let style = 'bg-gray-800 text-gray-300 border-gray-700';
    let Icon = Info;
    let defaultLabel = severity.toUpperCase();

    if (sev === 'critical' || sev === 'high') {
        style = 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950/40 font-extrabold';
        Icon = ShieldAlert;
        defaultLabel = 'HIGH RISK';
    } else if (sev === 'warning' || sev === 'moderate') {
        style = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
        Icon = AlertTriangle;
        defaultLabel = 'MODERATE';
    } else if (sev === 'low' || sev === 'info') {
        style = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold';
        Icon = CheckCircle2;
        defaultLabel = 'LOW RISK';
    }

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] tracking-wide border ${style} ${className}`}
        >
            <Icon className="h-3 w-3 shrink-0" />
            <span>{label || defaultLabel}</span>
        </span>
    );
}

// ==========================================
// 3. TICKER BADGE
// ==========================================
export interface TickerBadgeProps {
    symbol: string;
    changePercent?: number;
    companyName?: string;
    href?: string;
    className?: string;
}

export function TickerBadge({
    symbol,
    changePercent,
    companyName,
    href,
    className = '',
}: TickerBadgeProps) {
    const cleanSym = symbol.trim().toUpperCase();
    const linkHref = href || `/stocks/${cleanSym}`;
    const hasChange = typeof changePercent === 'number';
    const isUp = hasChange && changePercent > 0;
    const isDown = hasChange && changePercent < 0;

    const content = (
        <div
            className={`inline-flex items-center gap-1.5 rounded-xl border border-gray-800/90 bg-gray-900/90 px-2.5 py-1 text-xs font-bold text-gray-200 hover:border-gray-700 hover:bg-gray-800 transition shadow-sm ${className}`}
        >
            <span className="text-gray-100 tracking-wider">{cleanSym}</span>
            {companyName && (
                <span className="text-[10px] font-normal text-gray-400 hidden sm:inline max-w-[100px] truncate">
                    {companyName}
                </span>
            )}
            {hasChange && (
                <span
                    className={`inline-flex items-center font-mono text-[10px] font-semibold ${
                        isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-gray-400'
                    }`}
                >
                    {isUp ? (
                        <ArrowUpRight className="h-3 w-3" />
                    ) : isDown ? (
                        <ArrowDownRight className="h-3 w-3" />
                    ) : null}
                    {isUp ? '+' : ''}
                    {changePercent.toFixed(1)}%
                </span>
            )}
        </div>
    );

    return <Link href={linkHref}>{content}</Link>;
}

// ==========================================
// 4. AI INSIGHT INDICATOR
// ==========================================
export interface AIInsightIndicatorProps {
    label?: string;
    className?: string;
}

export function AIInsightIndicator({
    label = 'AI Synthesized',
    className = '',
}: AIInsightIndicatorProps) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shadow-sm ${className}`}
        >
            <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
            <span>{label}</span>
        </span>
    );
}
