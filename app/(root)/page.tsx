import { AIDailyBriefing } from "@/features/dashboard/AIDailyBriefing";
import { AIMarketInsights } from "@/features/dashboard/AIMarketInsights";
import { WatchlistIntelligenceGrid } from "@/features/dashboard/WatchlistIntelligenceGrid";
import { DashboardOverviewWidgets } from "@/features/dashboard/DashboardOverviewWidgets";
import { AIOpportunitiesRadar } from "@/features/dashboard/AIOpportunitiesRadar";
import { RiskRadar } from "@/features/dashboard/RiskRadar";
import { AIInsightsFeed } from "@/features/dashboard/AIInsightsFeed";
import { AIAssistantChat } from "@/features/ai-assistant/AIAssistantChat";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getPersonalizationService } from "@/services/personalization";

export default async function DashboardPage() {
    let watchlistSymbols: string[] = [];
    let userPreferences: any = undefined;

    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if (session?.user?.email) {
            watchlistSymbols = await getWatchlistSymbolsByEmail(session.user.email);
            const prefRes = await getPersonalizationService().getUserProfile(session.user.email);
            if (prefRes.success) {
                userPreferences = prefRes.data;
            }
        }
    } catch {
        // Fallback gracefully for unauthenticated views
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            <main className="container mx-auto px-4 py-6 md:py-8 space-y-12">
                {/* 1. AI Daily Briefing */}
                <section id="daily-briefing">
                    <AIDailyBriefing
                        watchlistSymbols={watchlistSymbols}
                        userPreferences={userPreferences}
                    />
                </section>

                {/* 2. AI Market Insights */}
                <section id="market-insights">
                    <AIMarketInsights />
                </section>

                {/* 3. Personalized Watchlist Intelligence */}
                <section id="watchlist-intelligence">
                    <WatchlistIntelligenceGrid />
                </section>

                {/* 4. Opportunities Radar & 5. Risk Radar (Side-by-side or stacked) */}
                <div className="grid grid-cols-1 gap-12">
                    <section id="opportunities">
                        <AIOpportunitiesRadar />
                    </section>

                    <section id="risk-radar">
                        <RiskRadar />
                    </section>
                </div>

                {/* 6. AI Insights Feed */}
                <section id="insights-feed">
                    <AIInsightsFeed />
                </section>

                {/* 7. Market Overview (Charts, Heatmap, Quotes, News) */}
                <section id="market-overview">
                    <DashboardOverviewWidgets />
                </section>
            </main>

            {/* Global Collapsible AI Assistant Copilot */}
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
