'use client';

import React from 'react';
import Image from 'next/image';
import { NewsArticleEntity } from '@/types/news';
import { Clock, ExternalLink, Newspaper, TrendingUp } from 'lucide-react';

interface TopStoriesProps {
    stories: NewsArticleEntity[];
}

function formatTimeAgo(datetime: number): string {
    if (!datetime) return 'Recently';
    const timestampMs = datetime < 10000000000 ? datetime * 1000 : datetime;
    const diffSec = Math.floor((Date.now() - timestampMs) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
}

export function TopStories({ stories }: TopStoriesProps) {
    if (!stories || stories.length === 0) {
        return (
            <div className="rounded-3xl orbital-card p-8 text-center border border-[rgba(148,163,184,0.14)] space-y-3">
                <Newspaper className="h-8 w-8 text-[#94A3B8] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-[#F4F7FF]">No market stories currently available</h3>
                <p className="text-xs text-[#94A3B8]">Market news will refresh as updates arrive from financial wire services.</p>
            </div>
        );
    }

    const featured = stories[0];
    const secondaryStories = stories.slice(1);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-[#F4F7FF] flex items-center gap-2">
                        <Newspaper className="h-5 w-5 text-[#35D6FF]" />
                        <span>Top Market Stories</span>
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                        Breaking financial journalism and macroeconomic coverage from global wire services.
                    </p>
                </div>
                <span className="text-[10px] font-mono text-[#35D6FF] bg-[#35D6FF]/10 px-2.5 py-1 rounded-full border border-[#35D6FF]/30">
                    Verified Wire
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Featured Top Story */}
                {featured && (
                    <div className="lg:col-span-7">
                        <a
                            href={featured.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="orbital-card orbital-card-interactive flex flex-col justify-between h-full p-5 md:p-6 group relative overflow-hidden space-y-4"
                        >
                            {/* Optional Featured Image */}
                            {featured.image ? (
                                <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden bg-[#080D1B] border border-[rgba(148,163,184,0.1)]">
                                    <Image
                                        src={featured.image}
                                        alt={featured.headline}
                                        fill
                                        unoptimized
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1424] via-transparent to-transparent opacity-80" />
                                </div>
                            ) : (
                                <div className="w-full h-36 rounded-2xl bg-gradient-to-br from-[#7C5CFF]/15 via-[#080D1B] to-[#35D6FF]/10 border border-[rgba(148,163,184,0.1)] flex items-center justify-center">
                                    <Newspaper className="h-10 w-10 text-[#35D6FF]/40" />
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#35D6FF] bg-[#35D6FF]/15 px-2.5 py-0.5 rounded-full border border-[#35D6FF]/30">
                                        {featured.source || 'Market Wire'}
                                    </span>
                                    <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTimeAgo(featured.datetime)}
                                    </span>
                                    {featured.relatedSymbol && (
                                        <span className="text-[10px] font-mono font-bold text-[#7C5CFF] bg-[#7C5CFF]/15 px-2 py-0.5 rounded-md border border-[#7C5CFF]/30">
                                            ${featured.relatedSymbol}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg md:text-xl font-bold text-[#F4F7FF] leading-snug group-hover:text-[#35D6FF] transition-colors">
                                    {featured.headline}
                                </h3>

                                {featured.summary && (
                                    <p className="text-xs md:text-sm text-[#94A3B8] leading-relaxed line-clamp-3">
                                        {featured.summary}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2 border-t border-[rgba(148,163,184,0.1)] flex items-center justify-between text-xs text-[#35D6FF] font-semibold">
                                <span>Read Full Wire Report</span>
                                <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                        </a>
                    </div>
                )}

                {/* 2. Secondary Stories List */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                    {secondaryStories.map((item) => (
                        <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="orbital-card orbital-card-interactive p-4 flex gap-4 group items-start transition-all"
                        >
                            {item.image && (
                                <div className="relative w-20 h-20 sm:w-24 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-[#080D1B] border border-[rgba(148,163,184,0.1)] hidden xs:block">
                                    <Image
                                        src={item.image}
                                        alt={item.headline}
                                        fill
                                        unoptimized
                                        className="object-cover group-hover:scale-105 transition-transform"
                                    />
                                </div>
                            )}

                            <div className="flex-1 space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold uppercase text-[#35D6FF]">
                                        {item.source}
                                    </span>
                                    <span className="text-[#94A3B8]/40">•</span>
                                    <span className="text-[10px] text-[#94A3B8]">
                                        {formatTimeAgo(item.datetime)}
                                    </span>
                                    {item.relatedSymbol && (
                                        <span className="text-[10px] font-mono text-[#7C5CFF] font-bold">
                                            ${item.relatedSymbol}
                                        </span>
                                    )}
                                </div>

                                <h4 className="text-xs sm:text-sm font-bold text-[#F4F7FF] line-clamp-2 leading-snug group-hover:text-[#35D6FF] transition-colors">
                                    {item.headline}
                                </h4>

                                {item.summary && (
                                    <p className="text-[11px] text-[#94A3B8] line-clamp-2 leading-relaxed">
                                        {item.summary}
                                    </p>
                                )}
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
