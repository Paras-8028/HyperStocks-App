'use client';

import React, { useState, useEffect } from 'react';
import {
    NewsIntelligenceResponse,
    NewsSentimentLabel,
    PersonalizedNewsItem,
    MarketTimelineEvent,
    StockImpact,
} from '@/types/news';
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    ExternalLink,
    Filter,
    Flame,
    Layers,
    Newspaper,
    RefreshCw,
    Search,
    ShieldAlert,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export function NewsIntelligenceView({ className = '' }: { className?: string }) {
    const [data, setData] = useState<NewsIntelligenceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState<'all' | 'portfolio' | 'watchlist' | 'positive' | 'negative'>('all');
    const [selectedSector, setSelectedSector] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);

    const fetchNewsIntelligence = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/news?mode=intelligence');
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    setData(json.data);
                }
            }
        } catch (err) {
            console.error('Failed to load news intelligence:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNewsIntelligence();
    }, []);

    // Filter logic
    const filteredFeed = (data?.personalizedFeed || []).filter((item) => {
        const cluster = item.cluster;

        // Search match
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesHeadline = cluster.primaryHeadline.toLowerCase().includes(q);
            const matchesSummary = cluster.summary.toLowerCase().includes(q);
            const matchesStock = cluster.affectedStocks.some((s) => s.symbol.toLowerCase().includes(q));
            if (!matchesHeadline && !matchesSummary && !matchesStock) return false;
        }

        // Sector filter
        if (selectedSector !== 'all') {
            const inSector = cluster.affectedSectors.some(
                (s) => s.sector.toLowerCase() === selectedSector.toLowerCase()
            );
            if (!inSector) return false;
        }

        // Filter tab
        if (filterTab === 'portfolio') {
            return item.userRelevanceReasons.some((r) => r.toLowerCase().includes('portfolio'));
        }
        if (filterTab === 'watchlist') {
            return item.userRelevanceReasons.some((r) => r.toLowerCase().includes('watchlist'));
        }
        if (filterTab === 'positive') {
            return cluster.dominantSentiment === 'positive';
        }
        if (filterTab === 'negative') {
            return cluster.dominantSentiment === 'negative';
        }

        return true;
    });

    const formatTimeAgo = (ts: number) => {
        const diff = Math.floor((Date.now() - ts) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        const hours = Math.floor(diff / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const getSentimentBadge = (sentiment: NewsSentimentLabel) => {
        switch (sentiment) {
            case 'positive':
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        POSITIVE
                    </span>
                );
            case 'negative':
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                        <TrendingDown className="h-3 w-3" />
                        NEGATIVE
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-800 border border-gray-700 px-2 py-0.5 text-[10px] font-bold text-gray-300">
                        <Activity className="h-3 w-3" />
                        NEUTRAL
                    </span>
                );
        }
    };

    return (
        <div className={`space-y-8 ${className}`}>
            {/* Header Title & Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            AI News Intelligence
                        </span>
                        {data && (
                            <span className="text-xs text-gray-500">
                                {data.totalArticlesAnalyzed} articles ingested & synthesized
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-100">
                        Market News & Intelligence
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400 max-w-2xl">
                        AI-synthesized financial events with deterministic sentiment, sector impacts, story clustering, and personalized causality.
                    </p>
                </div>

                <button
                    onClick={fetchNewsIntelligence}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-800 bg-gray-900/80 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800 hover:text-emerald-400 transition"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Feed
                </button>
            </div>

            {/* 1. AI EXECUTIVE BRIEFING CARD */}
            {data?.marketSummary && (
                <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-gray-900/90 via-gray-950 to-gray-900/70 p-6 shadow-2xl backdrop-blur">
                    <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                                    Today&apos;s Market Synthesis
                                </span>
                            </div>
                            <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Updated {formatTimeAgo(data.marketSummary.timestamp)}
                            </span>
                        </div>

                        <div>
                            <h2 className="text-lg sm:text-xl font-extrabold text-gray-100 leading-snug">
                                {data.marketSummary.headline}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
                                {data.marketSummary.marketNarrative}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                            {/* Key Catalysts */}
                            <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 mb-1.5">
                                    <Flame className="h-3 w-3" /> Key Catalysts
                                </span>
                                <ul className="space-y-1">
                                    {data.marketSummary.keyCatalysts.map((cat, idx) => (
                                        <li key={idx} className="text-[11px] text-gray-300 line-clamp-2">
                                            • {cat}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Top Risks */}
                            <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1 mb-1.5">
                                    <ShieldAlert className="h-3 w-3" /> Key Risks
                                </span>
                                <ul className="space-y-1">
                                    {data.marketSummary.topRisks.map((risk, idx) => (
                                        <li key={idx} className="text-[11px] text-gray-400 line-clamp-2">
                                            • {risk}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Opportunities */}
                            <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1 mb-1.5">
                                    <TrendingUp className="h-3 w-3" /> Opportunities
                                </span>
                                <ul className="space-y-1">
                                    {data.marketSummary.topOpportunities.map((opp, idx) => (
                                        <li key={idx} className="text-[11px] text-gray-400 line-clamp-2">
                                            • {opp}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. MARKET EVENT TIMELINE */}
            {data?.timeline && data.timeline.length > 0 && (
                <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-emerald-400" />
                            <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                                Market Event Timeline
                            </h3>
                        </div>
                        <span className="text-[11px] text-gray-500">Chronological Event Flow</span>
                    </div>

                    <div className="relative border-l-2 border-gray-800 ml-3 pl-4 space-y-4">
                        {data.timeline.slice(0, 6).map((event) => (
                            <div key={event.id} className="relative group">
                                {/* Timeline Dot */}
                                <div
                                    className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-gray-950 ${
                                        event.sentiment === 'positive'
                                            ? 'bg-emerald-400'
                                            : event.sentiment === 'negative'
                                            ? 'bg-rose-400'
                                            : 'bg-gray-400'
                                    }`}
                                />

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold text-gray-500">
                                            {formatTimeAgo(event.timestamp)}
                                        </span>
                                        {getSentimentBadge(event.sentiment)}
                                        {event.keySymbols.map((sym) => (
                                            <span
                                                key={sym}
                                                className="rounded bg-gray-800 border border-gray-700 px-1.5 py-0.5 text-[10px] font-bold text-gray-300"
                                            >
                                                {sym}
                                            </span>
                                        ))}
                                        <span className="text-[10px] text-gray-500">• {event.source}</span>
                                    </div>

                                    <h4 className="text-xs font-semibold text-gray-200 group-hover:text-emerald-400 transition leading-snug">
                                        {event.url ? (
                                            <a
                                                href={event.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1"
                                            >
                                                {event.title}
                                                <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                                            </a>
                                        ) : (
                                            event.title
                                        )}
                                    </h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. PERSONALIZED NEWS FEED & CLUSTERED STORIES */}
            <div className="space-y-4">
                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur">
                    {/* Tab Filters */}
                    <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                        <button
                            onClick={() => setFilterTab('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                filterTab === 'all'
                                    ? 'bg-emerald-500 text-gray-950 font-bold'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            All Stories ({data?.personalizedFeed.length || 0})
                        </button>
                        <button
                            onClick={() => setFilterTab('portfolio')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                filterTab === 'portfolio'
                                    ? 'bg-emerald-500 text-gray-950 font-bold'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            My Portfolio Impact
                        </button>
                        <button
                            onClick={() => setFilterTab('watchlist')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                filterTab === 'watchlist'
                                    ? 'bg-emerald-500 text-gray-950 font-bold'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Watchlist Impact
                        </button>
                        <button
                            onClick={() => setFilterTab('positive')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                filterTab === 'positive'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Bullish
                        </button>
                        <button
                            onClick={() => setFilterTab('negative')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                filterTab === 'negative'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Bearish / Risks
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Filter by symbol or topic..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl bg-gray-950 border border-gray-800 pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* News Items List */}
                {loading ? (
                    <div className="py-16 text-center text-xs text-gray-400 animate-pulse">
                        Analyzing real-time financial wires and generating intelligence models...
                    </div>
                ) : filteredFeed.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-gray-800 bg-gray-900/40 text-xs text-gray-400">
                        No news events match your current filter criteria.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredFeed.map((item) => {
                            const cluster = item.cluster;
                            const isExpanded = expandedClusterId === cluster.id;

                            return (
                                <div
                                    key={cluster.id}
                                    className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 hover:border-gray-700 transition backdrop-blur space-y-3 shadow-lg"
                                >
                                    {/* Top Metadata Row: Sentiment, Topic, Relevance Score, Time */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getSentimentBadge(cluster.dominantSentiment)}
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                {cluster.topic}
                                            </span>
                                            {cluster.articles.length > 1 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                                                    <Layers className="h-3 w-3" />
                                                    {cluster.articles.length} sources
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Relevance Score */}
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                    item.relevanceScore >= 75
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                        : item.relevanceScore >= 50
                                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                        : 'bg-gray-800 text-gray-400 border-gray-700'
                                                }`}
                                                title={`Personal Relevance Score: ${item.relevanceScore}/100`}
                                            >
                                                Match {item.relevanceScore}%
                                            </span>
                                            <span className="text-[11px] text-gray-500">
                                                {formatTimeAgo(cluster.lastUpdated)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Primary Headline */}
                                    <h3 className="text-base sm:text-lg font-bold text-gray-100 leading-snug">
                                        {cluster.primaryHeadline}
                                    </h3>

                                    {/* Summary */}
                                    {cluster.summary && (
                                        <p className="text-xs text-gray-300 leading-relaxed">
                                            {cluster.summary}
                                        </p>
                                    )}

                                    {/* PERSONALIZED CAUSALITY EXPLANATION ("Why this matters to you") */}
                                    <div className="rounded-xl bg-gradient-to-r from-gray-950 via-gray-900/90 to-gray-950 border border-emerald-500/20 p-3 space-y-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                            <Sparkles className="h-3 w-3" />
                                            Why this matters to you:
                                        </div>
                                        <p className="text-xs text-gray-300 italic leading-relaxed">
                                            &ldquo;{item.personalExplanation}&rdquo;
                                        </p>
                                    </div>

                                    {/* Impact Badges: Affected Stocks and Sectors */}
                                    <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Affected Stocks */}
                                            {cluster.affectedStocks.map((stock) => (
                                                <Link
                                                    key={stock.symbol}
                                                    href={`/stocks/${stock.symbol}`}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-gray-800/90 border border-gray-700 px-2 py-1 text-[11px] font-bold text-gray-200 hover:border-emerald-500/50 hover:text-emerald-400 transition"
                                                >
                                                    <span>{stock.symbol}</span>
                                                    {stock.direction === 'positive' ? (
                                                        <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                                                    ) : stock.direction === 'negative' ? (
                                                        <ArrowDownRight className="h-3 w-3 text-rose-400" />
                                                    ) : null}
                                                </Link>
                                            ))}

                                            {/* Affected Sectors */}
                                            {cluster.affectedSectors.map((sec) => (
                                                <span
                                                    key={sec.sector}
                                                    className="rounded-lg bg-gray-900 border border-gray-800 px-2 py-1 text-[10px] font-semibold text-gray-400"
                                                >
                                                    {sec.sector}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Expand Multi-Article Coverage Toggle */}
                                        {cluster.articles.length > 1 && (
                                            <button
                                                onClick={() =>
                                                    setExpandedClusterId(isExpanded ? null : cluster.id)
                                                }
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-200 transition"
                                            >
                                                <span>
                                                    {isExpanded
                                                        ? 'Hide related articles'
                                                        : `View all ${cluster.articles.length} sources`}
                                                </span>
                                                <ChevronDown
                                                    className={`h-3.5 w-3.5 transition-transform ${
                                                        isExpanded ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>
                                        )}
                                    </div>

                                    {/* Expanded Articles in Cluster */}
                                    {isExpanded && cluster.articles.length > 1 && (
                                        <div className="border-t border-gray-800 pt-3 mt-3 space-y-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                Additional Media Coverage in this Event Cluster:
                                            </span>
                                            {cluster.articles.map((art) => (
                                                <a
                                                    key={art.id}
                                                    href={art.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-950/70 border border-gray-800/80 hover:border-gray-700 hover:bg-gray-950 transition text-xs group"
                                                >
                                                    <div>
                                                        <h4 className="font-semibold text-gray-200 group-hover:text-emerald-400 transition">
                                                            {art.headline}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                                                            <span>{art.source}</span>
                                                            <span>•</span>
                                                            <span>{formatTimeAgo(art.datetime)}</span>
                                                        </div>
                                                    </div>
                                                    <ExternalLink className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-300 shrink-0 ml-2" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
