'use client';

import React from 'react';
import { StockThesis } from '@/types/ai';
import { Sparkles, TrendingUp, TrendingDown, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface AIThesisCardProps {
    thesis: StockThesis;
    className?: string;
}

export function AIThesisCard({ thesis, className = '' }: AIThesisCardProps) {
    const verdictColors: Record<StockThesis['verdict'], { bg: string; text: string; border: string }> = {
        strong_buy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
        buy: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
        hold: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
        underweight: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
        sell: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
    };

    const verdictFormat: Record<StockThesis['verdict'], string> = {
        strong_buy: 'STRONG BUY',
        buy: 'BUY',
        hold: 'HOLD',
        underweight: 'UNDERWEIGHT',
        sell: 'SELL',
    };

    const style = verdictColors[thesis.verdict] || verdictColors.hold;

    return (
        <div
            className={`rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur shadow-xl space-y-6 ${className}`}
        >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                            AI Investment Thesis
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-normal">
                                Gemini Flash
                            </span>
                        </h3>
                        <p className="text-xs text-gray-400">
                            Automated quantitative & qualitative equity synthesis
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-xs text-gray-400">AI Confidence</div>
                        <div className="text-sm font-semibold text-gray-200">
                            {thesis.confidenceScore}%
                        </div>
                    </div>
                    <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider border ${style.bg} ${style.text} ${style.border}`}
                    >
                        {verdictFormat[thesis.verdict]}
                    </span>
                </div>
            </div>

            {/* Summary */}
            <p className="text-sm text-gray-300 leading-relaxed bg-gray-850/50 p-4 rounded-xl border border-gray-800/80">
                {thesis.summary}
            </p>

            {/* Bull vs Bear Cases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bull Case */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        <TrendingUp className="h-4 w-4" />
                        Bull Case
                    </div>
                    <ul className="space-y-1.5 text-xs text-gray-300">
                        {thesis.bullCase.map((pt, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{pt}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Bear Case */}
                <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider">
                        <TrendingDown className="h-4 w-4" />
                        Bear Case
                    </div>
                    <ul className="space-y-1.5 text-xs text-gray-300">
                        {thesis.bearCase.map((pt, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-rose-400 font-bold shrink-0">•</span>
                                <span>{pt}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Catalysts & Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-yellow-400">
                        <Zap className="h-3.5 w-3.5" />
                        Key Catalysts
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {thesis.catalysts.map((cat, i) => (
                            <span
                                key={i}
                                className="bg-gray-800 text-gray-300 px-2.5 py-1 rounded-md border border-gray-700/60"
                            >
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-orange-400">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Key Risks
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {thesis.risks.map((risk, i) => (
                            <span
                                key={i}
                                className="bg-gray-800 text-gray-300 px-2.5 py-1 rounded-md border border-gray-700/60"
                            >
                                {risk}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Valuation Assessment */}
            {thesis.valuationAssessment && (
                <div className="pt-2 border-t border-gray-800 text-xs text-gray-400">
                    <span className="font-semibold text-gray-300">Valuation: </span>
                    {thesis.valuationAssessment}
                </div>
            )}

            {/* Disclaimer */}
            <div className="text-[11px] text-gray-500 italic">
                {thesis.disclaimer}
            </div>
        </div>
    );
}
