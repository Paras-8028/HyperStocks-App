"use client";

import { useState } from "react";
import MiniChart from "@/components/MiniChart";
import FullChart from "@/components/FullChart";
import WatchlistButton from "@/components/WatchlistButton";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { cn } from "@/lib/utils";
import WatchlistAlertList from "./WatchlistAlertList";
import { createAlert } from "@/lib/actions/alert.actions";
import { toast } from "sonner";

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

    const [targetPrice, setTargetPrice] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAddAlert = async () => {
        if (!price) {
            toast.error("Live price not available");
            return;
        }

        const target = Number(targetPrice);
        if (!target || target <= 0) {
            toast.error("Enter a valid target price");
            return;
        }

        const condition = target > price ? "above" : "below";

        try {
            setLoading(true);
            await createAlert(item.symbol, condition, target);
            toast.success(`Alert set ${condition} $${target}`);
            setTargetPrice("");
        } catch (e: any) {
            toast.error(e?.message || "Failed to create alert");
        } finally {
            setLoading(false);
        }
    };



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
                    className="text-green-400 hover:underline"
                >
                    {expanded ? "Hide full chart" : "View full chart"}
                </button>

                <span className="text-gray-500">Alerts</span>
            </div>

            {/* ALERT INPUT */}
            <div className="flex items-center gap-3">
                <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Target price"
                    className="w-32 px-3 py-2 rounded-md bg-black border border-gray-700 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                />

                <button
                    onClick={handleAddAlert}
                    disabled={loading}
                    className="px-4 py-2 rounded-md bg-green-500 text-black text-sm font-medium hover:bg-green-400 disabled:opacity-50"
                >
                    {loading ? "Adding..." : "Add alert"}
                </button>
            </div>

            {/* ALERT LIST */}
            <WatchlistAlertList symbol={item.symbol} />

        </div>
    );
};

export default WatchlistRow;
