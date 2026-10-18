'use client';

import React from 'react';
import { FinancialMetrics } from '@/types/market';
import { Activity, Award, BarChart2, DollarSign, Percent, Shield } from 'lucide-react';

export interface KeyFinancialMetricsProps {
    metrics: FinancialMetrics;
    className?: string;
}

export function KeyFinancialMetrics({ metrics, className = '' }: KeyFinancialMetricsProps) {
    const items = [
        {
            label: 'P/E Ratio (TTM)',
            value: metrics.peRatio ? metrics.peRatio.toFixed(2) : 'N/A',
            icon: BarChart2,
            sub: metrics.peRatio && metrics.peRatio > 35 ? 'Growth premium' : 'Value range',
        },
        {
            label: 'Beta (Volatility)',
            value: metrics.beta ? metrics.beta.toFixed(2) : 'N/A',
            icon: Activity,
            sub: metrics.beta && metrics.beta > 1.2 ? 'Higher than market' : 'Defensive / Stable',
        },
        {
            label: 'Dividend Yield',
            value: metrics.dividendYield ? `${metrics.dividendYield.toFixed(2)}%` : '0.00%',
            icon: Percent,
            sub: 'Annual distribution',
        },
        {
            label: '52-Week Range',
            value: metrics.fiftyTwoWeekLow && metrics.fiftyTwoWeekHigh
                ? `$${metrics.fiftyTwoWeekLow.toFixed(1)} - $${metrics.fiftyTwoWeekHigh.toFixed(1)}`
                : 'N/A',
            icon: Shield,
            sub: 'Annual corridor',
        },
    ];

    return (
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
            {items.map((item, i) => {
                const Icon = item.icon;
                return (
                    <div
                        key={i}
                        className="rounded-xl border border-gray-800 bg-gray-850/50 p-4 space-y-1.5 backdrop-blur"
                    >
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{item.label}</span>
                            <Icon className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <div className="text-base font-bold text-gray-100">{item.value}</div>
                        <div className="text-[11px] text-gray-500">{item.sub}</div>
                    </div>
                );
            })}
        </div>
    );
}
