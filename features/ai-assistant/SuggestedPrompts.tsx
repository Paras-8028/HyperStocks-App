'use client';

import React from 'react';
import {
    Activity,
    ArrowRight,
    BarChart2,
    Briefcase,
    Eye,
    Globe2,
    Sparkles,
} from 'lucide-react';

export interface SuggestedPromptsProps {
    onSelectPrompt: (prompt: string) => void;
    currentSymbol?: string;
    className?: string;
}

export function SuggestedPrompts({
    onSelectPrompt,
    currentSymbol,
    className = '',
}: SuggestedPromptsProps) {
    const contextualPrompts = currentSymbol
        ? [
              {
                  label: `What happened to ${currentSymbol} today?`,
                  icon: Activity,
                  category: 'Catalysts',
              },
              {
                  label: `Analyze ${currentSymbol} valuation and growth outlook.`,
                  icon: BarChart2,
                  category: 'Valuation',
              },
              {
                  label: `Explain the technical support and resistance levels for ${currentSymbol}.`,
                  icon: Sparkles,
                  category: 'Technicals',
              },
              {
                  label: `Compare ${currentSymbol} with its primary sector peers.`,
                  icon: ArrowRight,
                  category: 'Peer Comparison',
              },
          ]
        : [
              {
                  label: 'What happened to Apple stock today?',
                  icon: Activity,
                  category: 'Equities',
              },
              {
                  label: 'Why is Tesla down?',
                  icon: Activity,
                  category: 'Equities',
              },
              {
                  label: 'Analyze Nvidia.',
                  icon: BarChart2,
                  category: 'Equities',
              },
              {
                  label: 'Compare Apple and Microsoft.',
                  icon: ArrowRight,
                  category: 'Comparison',
              },
              {
                  label: 'What are the biggest risks in my portfolio?',
                  icon: Briefcase,
                  category: 'Portfolio',
              },
              {
                  label: 'Which stocks in my watchlist are performing poorly?',
                  icon: Eye,
                  category: 'Watchlist',
              },
              {
                  label: "Summarize today's market.",
                  icon: Globe2,
                  category: 'Macro',
              },
              {
                  label: 'Which sectors are performing best today?',
                  icon: Sparkles,
                  category: 'Sectors',
              },
          ];

    return (
        <div className={`space-y-2.5 ${className}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Suggested Intelligence Queries
            </div>

            <div className="flex flex-wrap gap-2">
                {contextualPrompts.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={index}
                            onClick={() => onSelectPrompt(item.label)}
                            className="group flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/80 px-3 py-2 text-left text-xs text-gray-300 backdrop-blur transition hover:border-emerald-500/40 hover:bg-gray-850 hover:text-white shadow-sm"
                        >
                            <Icon className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
