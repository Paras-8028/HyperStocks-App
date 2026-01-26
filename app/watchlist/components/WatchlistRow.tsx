"use client";

import { useState } from "react";
import MiniChart from "@/components/MiniChart";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { cn } from "@/lib/utils";

const WatchlistRow = ({
                          item,
                      }: {
    item: { symbol: string; company: string };
}) => {
    const { price, percent } = useLiveQuote(item.symbol);
    const [open, setOpen] = useState(false);

    const isUp = (percent ?? 0) >= 0;

    return (
        <div className="rounded-xl border border-gray-800 bg-gradient-to-b from-black to-gray-900 p-5 space-y-4">

            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">
                        {item.symbol}
                    </h3>
                    <p className="text-sm text-gray-400">{item.company}</p>

                    {price !== null && (
                        <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-semibold text-white">
                ${price.toFixed(2)}
              </span>
                            <span
                                className={cn(
                                    "text-sm font-medium",
                                    isUp ? "text-green-400" : "text-red-400"
                                )}
                            >
                {isUp ? "▲" : "▼"} {percent?.toFixed(2)}%
              </span>
                        </div>
                    )}
                </div>

                <WatchlistButton
                    symbol={item.symbol}
                    company={item.company}
                    isInWatchlist
                    type="icon"
                />
            </div>

            {/* MINI CHART */}
            <div className="rounded-lg border border-gray-800 overflow-hidden">
                <MiniChart symbol={item.symbol} />
            </div>

            {/* ACTION BAR */}
            <div className="flex items-center justify-between text-sm">
                <button
                    onClick={() => setOpen(!open)}
                    className="text-yellow-400 hover:underline"
                >
                    {open ? "Hide full chart" : "View full chart"}
                </button>
                <span className="text-gray-500">Alerts</span>
            </div>

            {/* FULL CHART */}
            {open && (
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                    <TradingViewWidget
                        scriptUrl="https://s3.tradingview.com/tv.js"
                        height={360}
                        config={{
                            symbol: `NASDAQ:${item.symbol}`,
                            interval: "D",
                            theme: "dark",
                            hide_top_toolbar: true,
                            allow_symbol_change: false,
                        }}
                    />
                </div>
            )}

            {/* ALERT INLINE */}
            <div className="flex items-center gap-3 pt-2">
                <input
                    type="number"
                    placeholder="Target price"
                    className="w-28 px-3 py-2 rounded-md bg-black border border-gray-700 text-sm text-gray-200 focus:ring-1 focus:ring-yellow-500"
                />
                <button className="px-4 py-2 rounded-md bg-yellow-500 text-black text-sm font-medium hover:bg-yellow-400">
                    Add alert
                </button>
            </div>
        </div>
    );
};

export default WatchlistRow;
