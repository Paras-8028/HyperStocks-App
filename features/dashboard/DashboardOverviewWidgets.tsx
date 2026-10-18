'use client';

import React, { useState } from 'react';
import TradingViewWidget from '@/components/TradingViewWidget';
import {
    HEATMAP_WIDGET_CONFIG,
    MARKET_DATA_WIDGET_CONFIG,
    MARKET_OVERVIEW_WIDGET_CONFIG,
    TOP_STORIES_WIDGET_CONFIG,
} from '@/lib/constants';
import { BarChart3, Flame, Globe2, Newspaper, Sparkles } from 'lucide-react';

export function DashboardOverviewWidgets({ className = '' }: { className?: string }) {
    const [activeTab, setActiveTab] = useState<'all' | 'charts' | 'heatmap' | 'news'>('all');
    const scriptUrl = 'https://s3.tradingview.com/external-embedding/embed-widget-';

    const cardStyle =
        'rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/90 backdrop-blur-xl p-4 overflow-hidden shadow-2xl space-y-3';

    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[#F4F7FF] flex items-center gap-2">
                        <Globe2 className="h-5 w-5 text-[#35D6FF]" />
                        Market Telemetry & Real-Time Global Flow
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                        Institutional market breadth, sector heatmaps, asset quotes, and breaking macro stories
                    </p>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl bg-[#0D1424] p-1 border border-[rgba(148,163,184,0.14)]">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            activeTab === 'all'
                                ? 'bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-[#050816] font-bold shadow-md shadow-[#7C5CFF]/20'
                                : 'text-[#94A3B8] hover:text-[#F4F7FF]'
                        }`}
                    >
                        Unified View
                    </button>
                    <button
                        onClick={() => setActiveTab('charts')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            activeTab === 'charts'
                                ? 'bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-[#050816] font-bold shadow-md shadow-[#7C5CFF]/20'
                                : 'text-[#94A3B8] hover:text-[#F4F7FF]'
                        }`}
                    >
                        Indices & Quotes
                    </button>
                    <button
                        onClick={() => setActiveTab('heatmap')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            activeTab === 'heatmap'
                                ? 'bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-[#050816] font-bold shadow-md shadow-[#7C5CFF]/20'
                                : 'text-[#94A3B8] hover:text-[#F4F7FF]'
                        }`}
                    >
                        Stock Heatmap
                    </button>
                </div>
            </div>

            {/* Grid 1: Market Overview & Stock Heatmap */}
            {(activeTab === 'all' || activeTab === 'charts' || activeTab === 'heatmap') && (
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {(activeTab === 'all' || activeTab === 'charts') && (
                        <div className={`${activeTab === 'charts' ? 'xl:col-span-3' : 'xl:col-span-1'} ${cardStyle}`}>
                            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#F4F7FF] uppercase tracking-wider">
                                    <BarChart3 className="h-4 w-4 text-[#35D6FF]" />
                                    Global Indices & Equities
                                </div>
                                <span className="text-[10px] text-[#3DFFA0] bg-[#3DFFA0]/15 px-2 py-0.5 rounded-full border border-[#3DFFA0]/30 font-semibold font-mono">
                                    Live Quotes
                                </span>
                            </div>
                            <TradingViewWidget
                                title="Market Overview"
                                scriptUrl={`${scriptUrl}market-overview.js`}
                                config={MARKET_OVERVIEW_WIDGET_CONFIG}
                                className="custom-chart"
                                height={560}
                            />
                        </div>
                    )}

                    {(activeTab === 'all' || activeTab === 'heatmap') && (
                        <div className={`${activeTab === 'heatmap' ? 'xl:col-span-3' : 'xl:col-span-2'} ${cardStyle}`}>
                            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#F4F7FF] uppercase tracking-wider">
                                    <Flame className="h-4 w-4 text-[#7C5CFF]" />
                                    S&P 500 Sector Heatmap
                                </div>
                                <span className="text-[10px] text-[#94A3B8] font-mono">
                                    Market Cap Weighted
                                </span>
                            </div>
                            <TradingViewWidget
                                title="Stock Heatmap"
                                scriptUrl={`${scriptUrl}stock-heatmap.js`}
                                config={HEATMAP_WIDGET_CONFIG}
                                height={560}
                            />
                        </div>
                    )}
                </section>
            )}

            {/* Grid 2: Timeline Stories & Real-Time Quotes */}
            {(activeTab === 'all' || activeTab === 'news') && (
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className={`xl:col-span-1 ${cardStyle}`}>
                        <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] pb-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#F4F7FF] uppercase tracking-wider">
                                <Newspaper className="h-4 w-4 text-[#35D6FF]" />
                                Market News Wire
                            </div>
                            <span className="text-[10px] text-[#94A3B8] font-mono">
                                Real-Time Feed
                            </span>
                        </div>
                        <TradingViewWidget
                            scriptUrl={`${scriptUrl}timeline.js`}
                            config={TOP_STORIES_WIDGET_CONFIG}
                            height={560}
                        />
                    </div>

                    <div className={`xl:col-span-2 ${cardStyle}`}>
                        <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] pb-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#F4F7FF] uppercase tracking-wider">
                                <Sparkles className="h-4 w-4 text-[#7C5CFF]" />
                                Major Market Quotes & Sector Indices
                            </div>
                            <span className="text-[10px] text-[#35D6FF] bg-[#35D6FF]/15 px-2 py-0.5 rounded-full border border-[#35D6FF]/30 font-semibold font-mono">
                                Multi-Asset
                            </span>
                        </div>
                        <TradingViewWidget
                            scriptUrl={`${scriptUrl}market-quotes.js`}
                            config={MARKET_DATA_WIDGET_CONFIG}
                            height={560}
                        />
                    </div>
                </section>
            )}
        </div>
    );
}
