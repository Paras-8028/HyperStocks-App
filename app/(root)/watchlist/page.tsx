import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import { auth } from "@clerk/nextjs/server";
import WatchlistTabs from "./components/WatchlistTabs";
import WatchlistEmpty from "./components/WatchlistEmpty";
import { getMarketService } from "@/services/market";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "My Watchlist | HyperStocks",
    description: "Track your favorite stocks and market movements.",
};

const WatchlistPage = async () => {
    const { userId } = await auth();

    if (!userId) {
        return <WatchlistEmpty />;
    }

    const watchlist = await getUserWatchlist(userId);

    if (!watchlist || watchlist.length === 0) {
        return <WatchlistEmpty />;
    }

    // Prefetch quotes concurrently for the initial view
    const marketService = getMarketService();
    const quoteResults = await Promise.allSettled(
        watchlist.map((item) => marketService.getQuote(item.symbol))
    );

    const initialQuotes: Record<string, any> = {};
    watchlist.forEach((item, idx) => {
        const res = quoteResults[idx];
        if (res.status === "fulfilled" && res.value.success && res.value.data) {
            initialQuotes[item.symbol] = res.value.data;
        }
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-orbital-entrance">
            <div className="space-y-1 mb-6">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#35D6FF]">
                    <span className="h-2 w-2 rounded-full bg-[#35D6FF] animate-pulse" />
                    Market Tracking
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F7FF] tracking-tight">
                    My Watchlist
                </h1>
                <p className="text-sm text-[#94A3B8]">
                    Track your favorite stocks and market movements.
                </p>
            </div>

            <WatchlistTabs items={watchlist} initialQuotes={initialQuotes} />
        </div>
    );
};

export default WatchlistPage;
