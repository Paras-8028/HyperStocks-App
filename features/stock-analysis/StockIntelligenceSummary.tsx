'use client';

import React, { useState, useEffect } from 'react';
import { FinancialMetrics, StockQuote } from '@/types/market';
import { StockThesis } from '@/types/ai';
import { AIThesisCard } from '@/features/ai-assistant/AIThesisCard';
import { AIThesisCardSkeleton } from '@/components/common/LoadingSkeleton';
import { KeyFinancialMetrics } from './KeyFinancialMetrics';
import { ErrorState } from '@/components/common/ErrorState';
import { Sparkles, RefreshCw } from 'lucide-react';

export interface StockIntelligenceSummaryProps {
    symbol: string;
    quote?: StockQuote;
    metrics?: FinancialMetrics;
    className?: string;
}

export function StockIntelligenceSummary({
    symbol,
    quote,
    metrics,
    className = '',
}: StockIntelligenceSummaryProps) {
    const [thesis, setThesis] = useState<StockThesis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateThesis = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol,
                    context: {
                        quote,
                        metrics,
                    },
                }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || `Request failed with code ${res.status}`);
            }

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to synthesize thesis');
            }

            setThesis(data.data);
        } catch (err: any) {
            console.error('generateThesis error:', err);
            setError(err?.message || 'Unable to connect to AI Intelligence engine');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Key financial ratios */}
            {metrics && <KeyFinancialMetrics metrics={metrics} />}

            {/* AI Thesis Section */}
            {loading && <AIThesisCardSkeleton />}

            {!loading && error && (
                <ErrorState
                    title="AI Thesis Analysis Unavailable"
                    message={error}
                    onRetry={generateThesis}
                />
            )}

            {!loading && !error && thesis && (
                <div className="space-y-3">
                    <AIThesisCard thesis={thesis} />
                    <div className="flex justify-end">
                        <button
                            onClick={generateThesis}
                            className="text-xs text-gray-400 hover:text-emerald-400 flex items-center gap-1.5 transition"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Regenerate Analysis
                        </button>
                    </div>
                </div>
            )}

            {!loading && !error && !thesis && (
                <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 to-gray-900/40 p-6 backdrop-blur flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center md:text-left">
                        <h4 className="text-base font-semibold text-gray-100 flex items-center justify-center md:justify-start gap-2">
                            <Sparkles className="h-4 w-4 text-emerald-400" />
                            Synthesize AI Equity Thesis
                        </h4>
                        <p className="text-xs text-gray-400 max-w-xl">
                            Deploy Google Gemini 2.5 Flash to generate a real-time institutional bull/bear
                            case, valuation assessment, and catalyst radar for {symbol.toUpperCase()}.
                        </p>
                    </div>

                    <button
                        onClick={generateThesis}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-xs font-bold text-gray-950 transition-all shadow-lg shadow-emerald-500/20 shrink-0"
                    >
                        <Sparkles className="h-4 w-4" />
                        Generate AI Thesis
                    </button>
                </div>
            )}
        </div>
    );
}
