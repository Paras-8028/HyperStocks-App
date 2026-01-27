"use client";

import { useState, useEffect } from "react";
import MiniChart from "@/components/MiniChart";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { cn } from "@/lib/utils";
import WatchlistAlertList from "./WatchlistAlertList";

const WatchlistRow = ({ item }: { item: { symbol: string; company: string } }) => {
    const { price, percent, direction } = useLiveQuote(item.symbol);
    const [expanded, setExpanded] = useState(false);

    const isUp = (percent ?? 0) >= 0;

    return (
        <div className="rounded-xl border border-gray-800 bg-gradient-to-b from-black to-gray-900 p-5 space-y-5">

            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">{item.symbol}</h3>
                    <p className="text-sm text-gray-400">{item.company}</p>

                    {price !== null && (
                        <div className="flex items-center gap-2 mt-1">
              <span
                  className={cn(
                      "text-xl font-semibold transition-colors",
                      direction === "up" && "text-green-400",
                      direction === "down" && "text-red-400"
                  )}
              >
                ${price.toFixed(2)}
              </span>
                            {percent !== null && (
                                <span
                                    className={cn(
                                        "text-sm font-medium",
                                        isUp ? "text-green-400" : "text-red-400"
                                    )}
                                >
                  {isUp ? "▲" : "▼"} {percent.toFixed(2)}%
                </span>
                            )}
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

            {/* CHART SLOT (FIXED) */}
            <div className="rounded-lg border border-gray-800 bg-[#0b0b0b] overflow-hidden">
                {!expanded ? (
                    <div className="h-[120px]">
                        <MiniChart symbol={item.symbol} />
                    </div>
                ) : (
                    <TradingViewWidget
                        scriptUrl="https://s3.tradingview.com/tv.js"
                        height={360}
                        className="custom-chart"
                        config={{
                            symbol: `NASDAQ:${item.symbol}`,
                            interval: "D",
                            theme: "dark",
                            hide_top_toolbar: true,
                            allow_symbol_change: false,
                        }}
                    />
                )}
            </div>

            {/* ACTION BAR */}
            <div className="flex items-center justify-between text-sm">
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="text-yellow-400 hover:underline"
                >
                    {expanded ? "Hide full chart" : "View full chart"}
                </button>
                <span className="text-gray-500">Alerts</span>
            </div>

            {/* ALERTS */}
            <WatchlistAlertList symbol={item.symbol} />
        </div>
    );
};

export default WatchlistRow;
