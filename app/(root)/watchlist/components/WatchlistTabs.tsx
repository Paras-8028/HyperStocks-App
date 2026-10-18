"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import WatchlistTable from "./WatchlistTable";
import WatchlistNews from "./WatchlistNews";
import WatchlistAlerts from "./WatchlistAlerts";

const TABS = ["Watchlist", "News", "Alerts"] as const;
type Tab = (typeof TABS)[number];

// ✅ Plain, serialized watchlist item (safe for Client Components)
export type WatchlistItem = {
    id?: string;
    symbol: string;
    company: string;
};

export default function WatchlistTabs({
    items,
    initialQuotes = {},
}: {
    items: WatchlistItem[];
    initialQuotes?: Record<string, any>;
}) {
    const [active, setActive] = useState<Tab>("Watchlist");

    return (
        <>
            {/* Tabs Header */}
            <div className="flex gap-4 border-b border-[rgba(148,163,184,0.14)] mb-6">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActive(tab)}
                        className={cn(
                            "pb-3 text-xs font-bold uppercase tracking-wider transition-all relative",
                            active === tab
                                ? "text-[#35D6FF]"
                                : "text-[#94A3B8] hover:text-[#F4F7FF]"
                        )}
                    >
                        {tab}
                        {active === tab && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] shadow-[0_0_8px_#35D6FF]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tabs Content */}
            {active === "Watchlist" && (
                <WatchlistTable items={items} initialQuotes={initialQuotes} />
            )}

            {active === "News" && (
                <WatchlistNews
                    symbols={items.map((item) => item.symbol)}
                />
            )}

            {active === "Alerts" && (
                <WatchlistAlerts
                    symbols={items.map((item) => item.symbol)}
                />
            )}
        </>
    );
}
