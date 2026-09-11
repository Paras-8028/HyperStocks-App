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
        'rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur p-4 overflow-hidden shadow-xl space-y-3';

    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Globe2 className="h-5 w-5 text-emerald-400" />
                        Market Overview & Real-Time Flow
                    </h2>
                    <p className="text-xs text-gray-400">
                        Institutional market breadth, sector heatmaps, asset quotes, and breaking macro stories
                    </p>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl bg-gray-900/80 p-1 border border-gray-800">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            activeTab === 'all'
                                ? 'bg-emerald-500 text-gray-950 font-bold'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Unified View
                    </button>
                    <button
                        onClick={() => setActiveTab('charts')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            activeTab === 'charts'
                                ? 'bg-emerald-500 text-gray-950 font-bold'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Indices & Quotes
                    </button>
                    <button
                        onClick={() => setActiveTab('heatmap')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            activeTab === 'heatmap'
                                ? 'bg-emerald-500 text-gray-950 font-bold'
                                : 'text-gray-400 hover:text-gray-200'
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
                            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                                    <BarChart3 className="h-4 w-4 text-emerald-400" />
                                    Global Indices & Equities
                                </div>
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
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
                            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                                    <Flame className="h-4 w-4 text-emerald-400" />
                                    S&P 500 Sector Heatmap
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono">
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
                        <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                                <Newspaper className="h-4 w-4 text-emerald-400" />
                                Market News Wire
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
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
                        <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                                <Sparkles className="h-4 w-4 text-emerald-400" />
                                Major Market Quotes & Sector Indices
                            </div>
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
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
