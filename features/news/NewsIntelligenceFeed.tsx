'use client';

import React, { useState, useEffect } from 'react';
import { NewsArticleEntity } from '@/types/news';
import { ExternalLink, Newspaper, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { TableRowSkeleton } from '@/components/common/LoadingSkeleton';

export interface NewsIntelligenceFeedProps {
    symbols?: string[];
    category?: string;
    className?: string;
}

export function NewsIntelligenceFeed({
    symbols = [],
    category = 'general',
    className = '',
}: NewsIntelligenceFeedProps) {
    const [news, setNews] = useState<NewsArticleEntity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (symbols.length > 0) params.set('symbols', symbols.join(','));
                if (category) params.set('category', category);

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
    }, [symbols.join(','), category]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-2 backdrop-blur">
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

    return (
        <div className={`space-y-3.5 ${className}`}>
            {news.map((item) => {
                const dateFormatted = new Date(item.datetime).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });

                return (
                    <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-xl border border-gray-800 bg-gray-900/60 p-4 hover:border-gray-700 hover:bg-gray-850/60 transition backdrop-blur space-y-2"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-semibold text-gray-100 group-hover:text-emerald-400 transition leading-snug">
                                {item.headline}
                            </h4>
                            <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-gray-300 shrink-0 mt-0.5" />
                        </div>

                        {item.summary && (
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                                {item.summary}
                            </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-400">{item.source}</span>
                                <span>•</span>
                                <span>{dateFormatted}</span>
                                {item.relatedSymbol && (
                                    <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-bold text-[10px]">
                                        {item.relatedSymbol}
                                    </span>
                                )}
                            </div>

                            {item.aiSentiment && (
                                <span
                                    className={`inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full border ${
                                        item.aiSentiment.label === 'bullish'
                                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                            : item.aiSentiment.label === 'bearish'
                                            ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                                            : 'text-gray-400 bg-gray-800 border-gray-700'
                                    }`}
                                >
                                    {item.aiSentiment.label === 'bullish' ? (
                                        <TrendingUp className="h-3 w-3" />
                                    ) : item.aiSentiment.label === 'bearish' ? (
                                        <TrendingDown className="h-3 w-3" />
                                    ) : (
                                        <Sparkles className="h-3 w-3" />
                                    )}
                                    {item.aiSentiment.label.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </a>
                );
            })}
        </div>
    );
}
