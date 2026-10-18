'use client';

import React, { useState, useEffect } from 'react';
import { NewsArticleEntity, NewsSentimentClass } from '@/types/news';
import {
    Activity,
    AlertTriangle,
    ChevronDown,
    ExternalLink,
    HelpCircle,
    Info,
    Newspaper,
    Shield,
    ShieldAlert,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { TableRowSkeleton } from '@/components/common/LoadingSkeleton';

export interface NewsIntelligenceFeedProps {
    symbols?: string[];
    category?: string;
    className?: string;
    autoSummarize?: boolean;
}

export function NewsIntelligenceFeed({
    symbols = [],
    category = 'general',
    className = '',
    autoSummarize = true,
}: NewsIntelligenceFeedProps) {
    const [news, setNews] = useState<NewsArticleEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedArticleIds, setExpandedArticleIds] = useState<Set<string | number>>(new Set());

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (symbols.length > 0) params.set('symbols', symbols.join(','));
                if (category) params.set('category', category);
                if (autoSummarize) params.set('summarize', 'true');

                const res = await fetch(`/api/news?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setNews(data.data || []);
                    }
                }
            } catch (err) {
                console.error('Failed to load news feed:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [symbols.join(','), category, autoSummarize]);

    const toggleExpand = (id: string | number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpandedArticleIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3 backdrop-blur">
                <TableRowSkeleton cols={3} />
                <TableRowSkeleton cols={3} />
                <TableRowSkeleton cols={3} />
            </div>
        );
    }

    if (news.length === 0) {
        return (
            <EmptyState
                title="No Market News Available"
                description="There are currently no breaking market stories for these tickers."
                icon={Newspaper}
            />
        );
    }

    const renderSentimentBadge = (sentiment?: NewsSentimentClass | string) => {
        switch (sentiment) {
            case 'bullish':
            case 'positive':
                return (
                    <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                        <TrendingUp className="h-3 w-3" />
                        BULLISH
                    </span>
                );
            case 'bearish':
            case 'negative':
                return (
                    <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full border text-rose-400 bg-rose-500/10 border-rose-500/30">
                        <TrendingDown className="h-3 w-3" />
                        BEARISH
                    </span>
                );
            case 'mixed':
                return (
                    <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full border text-purple-300 bg-purple-500/10 border-purple-500/30">
                        <Activity className="h-3 w-3" />
                        MIXED
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full border text-gray-400 bg-gray-800/80 border-gray-700">
                        <HelpCircle className="h-3 w-3" />
                        NEUTRAL
                    </span>
                );
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {news.map((item) => {
                const dateFormatted = new Date(item.datetime).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });

                const summary = item.aiSummary;
                const sentiment = summary?.sentiment || item.aiSentiment?.label || 'neutral';
                const isExpanded = expandedArticleIds.has(item.id);

                const srcRelScore = summary?.sourceReliabilityScore ?? summary?.confidenceDimensions?.sourceReliabilityScore;
                const interpScore = summary?.interpretationConfidenceScore ?? summary?.confidenceScore ?? (item.aiSentiment ? 0.75 : undefined);
                const dirUncert = summary?.directionalUncertaintyLevel ?? summary?.confidenceDimensions?.directionalUncertaintyLevel;

                return (
                    <div
                        key={item.id}
                        className="rounded-2xl border border-gray-800/90 bg-gray-900/70 p-4 hover:border-gray-700 transition backdrop-blur space-y-3 shadow-lg"
                    >
                        {/* Header: Headline & External Source Link */}
                        <div className="flex items-start justify-between gap-3">
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/link flex-1"
                            >
                                <h4 className="text-sm sm:text-base font-semibold text-gray-100 group-hover/link:text-[#35D6FF] transition leading-snug">
                                    {item.headline}
                                </h4>
                            </a>
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open original article"
                                className="text-gray-500 hover:text-gray-300 p-1 shrink-0 transition"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>

                        {/* Factual Description / Summary */}
                        {item.summary && (
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                                {item.summary}
                            </p>
                        )}

                        {/* Metadata row: Source, Timestamp, Symbols, Sentiment, and Separated Confidence Dimensions */}
                        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-gray-500 pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-300">{item.source}</span>
                                <span>•</span>
                                <span>{dateFormatted}</span>
                                {item.relatedSymbol && (
                                    <span className="px-1.5 py-0.5 rounded bg-gray-800/90 border border-gray-700 text-gray-200 font-bold text-[10px]">
                                        ${item.relatedSymbol}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Separated Confidence Dimensions */}
                                {srcRelScore !== undefined && (
                                    <span
                                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300"
                                        title={summary?.confidenceDimensions?.sourceReliabilityRationale || 'Source Reliability based on publisher authority and verification standards'}
                                    >
                                        Src: {(srcRelScore * 100).toFixed(0)}%
                                    </span>
                                )}

                                {interpScore !== undefined && (
                                    <span
                                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                                        title={summary?.confidenceDimensions?.interpretationRationale || 'Interpretation Confidence based on factual grounding'}
                                    >
                                        Interp: {(interpScore * 100).toFixed(0)}%
                                    </span>
                                )}

                                {dirUncert && (
                                    <span
                                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                            dirUncert === 'extreme'
                                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                                : dirUncert === 'high'
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                                : 'bg-gray-800/80 border-gray-700 text-gray-300'
                                        }`}
                                        title={summary?.confidenceDimensions?.directionalUncertaintyRationale || 'Directional Price Uncertainty'}
                                    >
                                        Uncert: {dirUncert.toUpperCase()}
                                    </span>
                                )}

                                {renderSentimentBadge(sentiment)}
                            </div>
                        </div>

                        {/* AI Impact Analysis Section (If available) */}
                        {summary && (
                            <div className="border-t border-gray-800/70 pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#35D6FF]">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        <span>AI Impact Analysis</span>
                                        <span className="text-[10px] font-normal text-gray-500">
                                            ({summary.isAIGenerated ? 'Google Gemini' : 'Evidence Synthesis'})
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => toggleExpand(item.id, e)}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-200 transition"
                                    >
                                        <span>{isExpanded ? 'Less' : 'Deep Dive'}</span>
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                </div>

                                {/* Why it matters summary (Always visible) */}
                                {summary.whyItMatters && (
                                    <p className="text-xs text-gray-300 leading-relaxed bg-gray-950/40 p-2.5 rounded-xl border border-gray-800/60">
                                        <span className="font-semibold text-gray-200">Impact: </span>
                                        {summary.whyItMatters}
                                    </p>
                                )}

                                {/* Expanded Deep-Dive Insights */}
                                {isExpanded && (
                                    <div className="space-y-3 pt-2 text-xs">
                                        {/* Phase 1: 3-Dimensional Confidence Breakdown */}
                                        <div className="rounded-xl bg-gray-950/70 border border-gray-800 p-3 space-y-2">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#35D6FF]">
                                                <Shield className="h-3.5 w-3.5" />
                                                3-Dimensional Confidence Assessment
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                                {/* Dimension 1: Source Reliability */}
                                                <div className="rounded-lg bg-gray-900/60 border border-gray-800/80 p-2 space-y-1">
                                                    <div className="text-gray-400 font-semibold text-[10px] uppercase">
                                                        1. Source Reliability
                                                    </div>
                                                    <div className="text-blue-300 font-mono font-bold text-xs">
                                                        {srcRelScore !== undefined ? `${(srcRelScore * 100).toFixed(0)}%` : 'N/A'}{' '}
                                                        <span className="text-[10px] font-normal text-gray-400">
                                                            ({summary.confidenceDimensions?.sourceReliabilityTier?.replace('_', ' ') || 'standard'})
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 leading-tight">
                                                        {summary.confidenceDimensions?.sourceReliabilityRationale || 'Based on publisher authority and verification standards.'}
                                                    </p>
                                                </div>

                                                {/* Dimension 2: Interpretation Confidence */}
                                                <div className="rounded-lg bg-gray-900/60 border border-gray-800/80 p-2 space-y-1">
                                                    <div className="text-gray-400 font-semibold text-[10px] uppercase">
                                                        2. Interpretation Clarity
                                                    </div>
                                                    <div className="text-emerald-300 font-mono font-bold text-xs">
                                                        {interpScore !== undefined ? `${(interpScore * 100).toFixed(0)}%` : 'N/A'}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 leading-tight">
                                                        {summary.confidenceDimensions?.interpretationRationale || summary.confidenceRationale || 'Based on direct factual metrics in text.'}
                                                    </p>
                                                </div>

                                                {/* Dimension 3: Market Directional Uncertainty */}
                                                <div className="rounded-lg bg-gray-900/60 border border-gray-800/80 p-2 space-y-1">
                                                    <div className="text-gray-400 font-semibold text-[10px] uppercase">
                                                        3. Price Direction Uncertainty
                                                    </div>
                                                    <div className="text-amber-300 font-mono font-bold text-xs">
                                                        {dirUncert ? dirUncert.toUpperCase() : 'MODERATE'}{' '}
                                                        <span className="text-[10px] font-normal text-gray-400">
                                                            ({summary.confidenceDimensions?.marketDirectionalUncertaintyScore !== undefined ? `${(summary.confidenceDimensions.marketDirectionalUncertaintyScore * 100).toFixed(0)}%` : '50%'})
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 leading-tight">
                                                        {summary.confidenceDimensions?.directionalUncertaintyRationale || 'Source authority does not guarantee stock price direction.'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-[10px] text-gray-500 italic pt-1 border-t border-gray-800/60">
                                                * Heuristic multi-dimensional scores. Not statistically calibrated posterior probabilities.
                                            </div>
                                        </div>

                                        {/* Company vs Market Sentiment Breakdown */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                            <div className="rounded-lg bg-gray-950/60 border border-gray-800/70 p-2 space-y-1">
                                                <div className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                                                    Company Sentiment
                                                </div>
                                                <div className="flex items-center gap-1.5 font-bold">
                                                    {renderSentimentBadge(summary.companySentiment || summary.sentiment)}
                                                    <span className="text-gray-300">
                                                        {summary.affectedEntity?.name || item.relatedSymbol || 'Tracked Entity'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="rounded-lg bg-gray-950/60 border border-gray-800/70 p-2 space-y-1">
                                                <div className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                                                    Market / Macro Sentiment
                                                </div>
                                                <div className="flex items-center gap-1.5 font-bold">
                                                    {renderSentimentBadge(summary.marketSentiment || 'neutral')}
                                                    <span className="text-gray-400">Broad Sector Context</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Short-Term vs Long-Term Considerations */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {summary.shortTermOutlook && (
                                                <div className="rounded-xl bg-gray-950/50 border border-gray-800/70 p-2.5 space-y-1">
                                                    <div className="text-[#35D6FF] font-semibold text-[11px] flex items-center gap-1">
                                                        <Zap className="h-3 w-3" /> Short-Term Outlook
                                                    </div>
                                                    <p className="text-[11px] text-gray-300 leading-relaxed">
                                                        {summary.shortTermOutlook}
                                                    </p>
                                                </div>
                                            )}

                                            {summary.longTermConsiderations && (
                                                <div className="rounded-xl bg-gray-950/50 border border-gray-800/70 p-2.5 space-y-1">
                                                    <div className="text-[#7C5CFF] font-semibold text-[11px] flex items-center gap-1">
                                                        <Info className="h-3 w-3" /> Long-Term Considerations
                                                    </div>
                                                    <p className="text-[11px] text-gray-300 leading-relaxed">
                                                        {summary.longTermConsiderations}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Supported Risks and Opportunities */}
                                        {((summary.risks && summary.risks.length > 0) ||
                                            (summary.opportunities && summary.opportunities.length > 0)) && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                {summary.risks && summary.risks.length > 0 && (
                                                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5 space-y-1">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                                                            <ShieldAlert className="h-3 w-3" /> Verified Risks
                                                        </div>
                                                        <ul className="space-y-1">
                                                            {summary.risks.map((risk, idx) => (
                                                                <li key={idx} className="text-[11px] text-gray-300">
                                                                    • {risk}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {summary.opportunities && summary.opportunities.length > 0 && (
                                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-1">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                                            <TrendingUp className="h-3 w-3" /> Verified Opportunities
                                                        </div>
                                                        <ul className="space-y-1">
                                                            {summary.opportunities.map((opp, idx) => (
                                                                <li key={idx} className="text-[11px] text-gray-300">
                                                                    • {opp}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Bottom Line & Source Verification */}
                                        <div className="flex items-center justify-between pt-1 text-[10px] text-gray-500">
                                            <span className="italic">
                                                AI-generated synthesis. Sentiment analysis is informational and not a price prediction.
                                            </span>
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[#35D6FF] hover:underline font-semibold"
                                            >
                                                Source: {item.source} <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
