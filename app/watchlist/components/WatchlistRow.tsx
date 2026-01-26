"use client";

import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { cn } from "@/lib/utils";

const WatchlistRow = ({
                          item,
                      }: {
    item: { symbol: string; company: string };
}) => {
    const { price, percent, loading } = useLiveQuote(item.symbol);
    const isUp = (percent ?? 0) >= 0;

    return (
        <div className="rounded-xl border border-gray-800 bg-black/40 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-white">
                        {item.symbol}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {item.company}
                    </p>

                    {!loading && price !== null && (
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-lg font-semibold text-white">
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

                {/* ICON ONLY */}
                <WatchlistButton
                    symbol={item.symbol}
                    company={item.company}
                    isInWatchlist
                    type="icon"
                />
            </div>

            {/* Chart */}
            <TradingViewWidget
                scriptUrl="https://s3.tradingview.com/tv.js"
                height={360}
                config={{
                    symbol: `NASDAQ:${item.symbol}`, // IMPORTANT
                    interval: "D",
                    theme: "dark",
                    style: "1",
                    locale: "en",
                    hide_top_toolbar: true,
                    allow_symbol_change: false,
                }}
            />
        </div>
    );
};

export default WatchlistRow;
