"use client";

import { useState } from "react";
import MiniChart from "@/components/MiniChart";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { cn } from "@/lib/utils";
import WatchlistAlertList from "./WatchlistAlertList";

const WatchlistRow = ({
                          item,
                      }: {
    item: { symbol: string; company: string };
}) => {
    const { price, percent, direction } = useLiveQuote(item.symbol);
    const [showFullChart, setShowFullChart] = useState(false);
    const [targetPrice, setTargetPrice] = useState("");

    const isUp = (percent ?? 0) >= 0;

    return (
        <div className="rounded-xl border border-gray-800 bg-gradient-to-b from-black to-gray-900 p-5 space-y-5">

            {/* ================= HEADER ================= */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
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
                      "text-xl font-semibold transition-colors duration-500",
                      direction === "up" && "text-green-400 animate-pulse",
                      direction === "down" && "text-red-400 animate-pulse",
                      !direction && "text-white"
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

                {/* STAR */}
                <WatchlistButton
                    symbol={item.symbol}
                    company={item.company}
                    isInWatchlist
                    type="icon"
                />
            </div>

            {/* ================= CHART CONTAINER (REPLACED) ================= */}
            <div
                className={cn(
                    "rounded-lg border border-gray-800 bg-[#0b0b0b] overflow-hidden transition-all",
                    showFullChart ? "h-[360px]" : "h-[120px]"
                )}
            >
                {!showFullChart ? (
                    <MiniChart symbol={item.symbol} />
                ) : (
                    <TradingViewWidget
                        scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
                        height={360}
                        className="custom-chart"
                        config={{
                            autosize: true,
                            symbol: `NASDAQ:${item.symbol}`,
                            interval: "D",
                            timezone: "Etc/UTC",
                            theme: "dark",
                            style: "1",
                            locale: "en",
                            hide_top_toolbar: true,
                            hide_legend: false,
                            allow_symbol_change: false,
                            save_image: false,
                            studies: [],
                            backgroundColor: "#0b0b0b",
                        }}
                    />
                )}
            </div>

            {/* ================= ACTION BAR ================= */}
            <div className="flex items-center justify-between text-sm">
                <button
                    onClick={() => setShowFullChart((v) => !v)}
                    className="text-yellow-400 hover:underline"
                >
                    {showFullChart ? "Hide full chart" : "View full chart"}
                </button>

                <span className="text-gray-500">
          Alerts
        </span>
            </div>

            {/* ================= ALERT INPUT ================= */}
            <div className="flex items-center gap-3">
                <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Target price"
                    className="w-32 px-3 py-2 rounded-md bg-black border border-gray-700 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />

                <button className="px-4 py-2 rounded-md bg-yellow-500 text-black text-sm font-medium hover:bg-yellow-400 transition">
                    Add alert
                </button>
            </div>

            {/* ================= ALERT LIST ================= */}
            <WatchlistAlertList symbol={item.symbol} />
        </div>
    );
};

export default WatchlistRow;
