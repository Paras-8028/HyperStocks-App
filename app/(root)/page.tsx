import { AIDailyBriefing } from "@/features/dashboard/AIDailyBriefing";
import { AIMarketInsights } from "@/features/dashboard/AIMarketInsights";
import { WatchlistIntelligenceGrid } from "@/features/dashboard/WatchlistIntelligenceGrid";
import { DashboardOverviewWidgets } from "@/features/dashboard/DashboardOverviewWidgets";
import { AIOpportunitiesRadar } from "@/features/dashboard/AIOpportunitiesRadar";
import { RiskRadar } from "@/features/dashboard/RiskRadar";
import { AIInsightsFeed } from "@/features/dashboard/AIInsightsFeed";
import { AIAssistantChat } from "@/features/ai-assistant/AIAssistantChat";
import { MarketUniverse } from "@/features/market-universe";
import { auth } from "@clerk/nextjs/server";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getPersonalizationService } from "@/services/personalization";
import { Activity, BarChart2, Globe2, Radio, Sparkles, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
    let watchlistSymbols: string[] = [];
    let userPreferences: any = undefined;

    try {
        const { userId } = await auth();
        if (userId) {
            watchlistSymbols = await getWatchlistSymbolsByEmail(userId);
            const prefRes = await getPersonalizationService().getUserProfile(userId);
            if (prefRes.success) {
                userPreferences = prefRes.data;
            }
        }
    } catch {
        // Fallback gracefully for unauthenticated views
    }

    return (
        <div className="min-h-screen text-[#F4F7FF] relative selection:bg-[#7C5CFF]/30 selection:text-[#F4F7FF]">
            <main className="container mx-auto px-4 py-6 md:py-8 space-y-12">
                {/* 1. Hero Section: Financial Observatory */}
                <section className="relative overflow-hidden rounded-3xl orbital-card p-6 md:p-10 border border-[rgba(124,92,255,0.25)] shadow-[0_0_40px_rgba(124,92,255,0.08)]">
                    {/* Subtle decorative radial gradient */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-gradient-to-br from-[#7C5CFF]/15 to-[#35D6FF]/10 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-[#3DFFA0]/5 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(53,214,255,0.3)] bg-[#050816]/70 backdrop-blur-md text-xs font-mono">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3DFFA0] opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3DFFA0]" />
                                </span>
                                <span className="text-[#35D6FF] font-semibold tracking-wider uppercase text-[10px]">
                                    MARKET OBSERVATORY ONLINE
                                </span>
                                <span className="text-[#94A3B8]">•</span>
                                <span className="text-[#94A3B8] text-[11px]">Real-Time Market Telemetry</span>
                            </div>

                            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#F4F7FF] leading-[1.1]">
                                Explore the{' '}
                                <span className="bg-gradient-to-r from-[#7C5CFF] via-[#35D6FF] to-[#3DFFA0] bg-clip-text text-transparent">
                                    Financial Universe
                                </span>
                            </h1>

                            <p className="text-sm md:text-base text-[#94A3B8] leading-relaxed">
                                Institutional-grade financial intelligence powered by living market constellations, neural sector telemetry, and AI-driven predictive insights.
                            </p>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Link
                                    href="/overview"
                                    className="orbital-btn-primary inline-flex items-center gap-2 text-xs md:text-sm font-semibold"
                                >
                                    <BarChart2 className="h-4 w-4" />
                                    Market Overview
                                </Link>

                                <a
                                    href="#market-universe"
                                    className="orbital-btn-secondary inline-flex items-center gap-2 text-xs md:text-sm font-semibold"
                                >
                                    <Globe2 className="h-4 w-4" />
                                    Market Universe
                                </a>

                                <Link
                                    href="/watchlist"
                                    className="orbital-btn-secondary inline-flex items-center gap-2 text-xs md:text-sm font-semibold"
                                >
                                    <Activity className="h-4 w-4 text-[#35D6FF]" />
                                    My Watchlist
                                </Link>
                            </div>
                        </div>

                        {/* Market Status Telemetry Card */}
                        <div className="w-full lg:w-auto min-w-[280px] p-4 rounded-2xl bg-[#050816]/80 border border-[rgba(148,163,184,0.15)] backdrop-blur space-y-3">
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-[rgba(148,163,184,0.1)]">
                                <span className="text-[#94A3B8] font-mono uppercase text-[10px] tracking-wider">
                                    Telemetry Status
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[#3DFFA0] font-mono text-[11px]">
                                    <Radio className="h-3 w-3 animate-pulse" />
                                    System Nominal
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <div className="text-[10px] text-[#94A3B8]">Active Constellation</div>
                                    <div className="text-sm font-bold font-mono text-[#F4F7FF]">30+ Mega Caps</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-[#94A3B8]">AI Assistant</div>
                                    <div className="text-sm font-bold font-mono text-[#35D6FF]">Gemini 2.5 Active</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-[#94A3B8]">Market Feed</div>
                                    <div className="text-sm font-bold font-mono text-[#3DFFA0]">Finnhub Quotes</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-[#94A3B8]">Monitored Assets</div>
                                    <div className="text-sm font-bold font-mono text-[#7C5CFF]">
                                        {watchlistSymbols.length} Tracked
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Signature Feature: Market Universe */}
                <section id="market-universe" className="scroll-mt-24">
                    <MarketUniverse />
                </section>

                {/* 3. AI Daily Briefing */}
                <section id="daily-briefing">
                    <AIDailyBriefing
                        watchlistSymbols={watchlistSymbols}
                        userPreferences={userPreferences}
                    />
                </section>

                {/* 4. AI Market Insights */}
                <section id="market-insights">
                    <AIMarketInsights />
                </section>

                {/* 5. Personalized Watchlist Intelligence */}
                <section id="watchlist-intelligence">
                    <WatchlistIntelligenceGrid />
                </section>

                {/* 6. Opportunities Radar & Risk Radar */}
                <div className="grid grid-cols-1 gap-12">
                    <section id="opportunities">
                        <AIOpportunitiesRadar />
                    </section>

                    <section id="risk-radar">
                        <RiskRadar />
                    </section>
                </div>

                {/* 7. AI Insights Feed */}
                <section id="insights-feed">
                    <AIInsightsFeed />
                </section>

                {/* 8. Market Overview (Charts, Heatmap, Quotes, News) */}
                <section id="market-overview">
                    <DashboardOverviewWidgets />
                </section>
            </main>

            {/* Global Collapsible AI Assistant Copilot (AI TELESCOPE) */}
            <AIAssistantChat
                collapsible
                context={{
                    watchlistSymbols,
                    userProfile: userPreferences,
                }}
            />
        </div>
    );
}
