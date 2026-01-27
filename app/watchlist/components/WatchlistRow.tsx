"use client";

import { useState } from "react";
import MiniChart from "@/components/MiniChart";
import FullChart from "@/components/FullChart";
import WatchlistButton from "@/components/WatchlistButton";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { cn } from "@/lib/utils";
import WatchlistAlertList from "./WatchlistAlertList";

const WatchlistRow = ({
                          item,
                          onRemove,
                      }: {
    item: { symbol: string; company: string };
    onRemove: (symbol: string) => void;
}) => {
    const { price, percent, direction } = useLiveQuote(item.symbol);
    const [expanded, setExpanded] = useState(false);

    const isUp = (percent ?? 0) >= 0;

    return (
        <div className="rounded-xl border border-gray-800 bg-gradient-to-b from-black to-gray-900 p-5 space-y-5">

            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">
                        {item.symbol}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {item.company}
                    </p>

                    {price !== null && (
                        <div className="flex items-center gap-2 mt-1">
              <span
                  className={cn(
                      "text-xl font-semibold",
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
                    onWatchlistChange={(symbol, added) => {
                        if (!added) onRemove(symbol);
                    }}
                />
            </div>

            {/* CHART SLOT */}
            <div className="rounded-lg border border-gray-800 bg-[#0b0b0b] overflow-hidden">
                {!expanded ? (
                    <div className="h-[120px]">
                        <MiniChart symbol={item.symbol} />
                    </div>
                ) : (
                    <FullChart symbol={item.symbol} />
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
