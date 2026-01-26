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
                                      }: {
    items: WatchlistItem[];
}) {
    const [active, setActive] = useState<Tab>("Watchlist");

    return (
        <>
            {/* Tabs Header */}
            <div className="flex gap-6 border-b border-gray-700 mb-6">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActive(tab)}
                        className={cn(
                            "pb-3 text-sm font-medium transition-colors",
                            active === tab
                                ? "text-yellow-500 border-b-2 border-yellow-500"
                                : "text-gray-400 hover:text-gray-200"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tabs Content */}
            {active === "Watchlist" && (
                <WatchlistTable items={items} />
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
