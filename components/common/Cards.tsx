'use client';

import React from 'react';
import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

export interface FinancialCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

/**
 * Standard container primitive for financial and market content.
 * Features dark-mode glassmorphism, subtle borders, and smooth hover micro-interactions.
 */
export function FinancialCard({
    children,
    className = '',
    hoverEffect = true,
    ...props
}: FinancialCardProps) {
    return (
        <div
            className={`rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5 shadow-xl backdrop-blur-md transition-all duration-200 ${
                hoverEffect ? 'hover:border-gray-700/80 hover:bg-gray-900/80' : ''
            } ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export interface AICardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    title?: string;
    badgeLabel?: string;
    className?: string;
}

/**
 * Premium AI-enhanced card with subtle emerald/indigo ambient glow,
 * hairline gradient border, and AI badge.
 */
export function AICard({
    children,
    title,
    badgeLabel = 'AI Intelligence',
    className = '',
    ...props
}: AICardProps) {
    return (
        <div
            className={`relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-gray-900/90 via-gray-950 to-gray-900/70 p-6 shadow-2xl backdrop-blur-md transition-all duration-200 ${className}`}
            {...props}
        >
            {/* Ambient subtle glow background */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

            {/* Header if title or badge provided */}
            {(title || badgeLabel) && (
                <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
                    {title && (
                        <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                            {title}
                        </h3>
                    )}
                    {badgeLabel && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                            <Sparkles className="h-3 w-3" />
                            {badgeLabel}
                        </span>
                    )}
                </div>
            )}

            <div className="relative z-10">{children}</div>
        </div>
    );
}

export interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeFormatted?: string;
    subtitle?: string;
    icon?: any;
    className?: string;
    prefix?: string;
    suffix?: string;
}

/**
 * Compact financial metric card designed for high data density,
 * tabular monospace figures, and color-coded direction.
 */
export function MetricCard({
    title,
    value,
    change,
    changeFormatted,
    subtitle,
    icon: Icon,
    className = '',
    prefix = '',
    suffix = '',
}: MetricCardProps) {
    const isPositive = typeof change === 'number' && change > 0;
    const isNegative = typeof change === 'number' && change < 0;

    return (
        <div
            className={`rounded-2xl border border-gray-800/80 bg-gray-900/60 p-4 shadow-lg backdrop-blur transition-all duration-200 hover:border-gray-700/80 ${className}`}
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {title}
                </span>
                {Icon && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800/60 text-gray-400">
                        <Icon className="h-4 w-4" />
                    </div>
                )}
            </div>

            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="text-xl sm:text-2xl font-bold text-gray-100 font-mono tabular-nums tracking-tight">
                    {prefix}
                    {typeof value === 'number' ? value.toLocaleString() : value}
                    {suffix}
                </div>

                {typeof change === 'number' && (
                    <span
                        className={`inline-flex items-center gap-0.5 text-xs font-bold font-mono px-2 py-0.5 rounded-md border ${
                            isPositive
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                                : isNegative
                                ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                                : 'text-gray-400 bg-gray-800 border-gray-700'
                        }`}
                    >
                        {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : isNegative ? (
                            <TrendingDown className="h-3 w-3" />
                        ) : null}
                        {changeFormatted || `${isPositive ? '+' : ''}${change.toFixed(2)}%`}
                    </span>
                )}
            </div>

            {subtitle && (
                <p className="mt-1.5 text-[11px] text-gray-400 leading-tight">
                    {subtitle}
                </p>
            )}
        </div>
    );
}
