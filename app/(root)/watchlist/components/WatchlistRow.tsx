"use client";

import { useState } from "react";
import Link from "next/link";
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
        <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/90 p-5 space-y-4 backdrop-blur shadow-xl hover:border-[#7C5CFF]/40 transition duration-200">

            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/stocks/${item.symbol}`}
                            className="text-lg font-bold text-[#F4F7FF] hover:text-[#35D6FF] transition tracking-wide flex items-center gap-1 group"
                        >
                            {item.symbol}
                            <span className="text-xs opacity-0 group-hover:opacity-100 transition text-[#35D6FF]">→</span>
                        </Link>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[rgba(148,163,184,0.16)] bg-[#111B2E] text-[#94A3B8]">
                            Orbit Monitored
                        </span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                        {item.company}
                    </p>

                    {price !== null && (
                        <div className="flex items-center gap-2.5 mt-2 font-mono tabular-nums">
                            <span
                                className={cn(
                                    "text-xl font-bold tracking-tight",
                                    direction === "up" && "text-[#3DFFA0]",
                                    direction === "down" && "text-[#FF5470]",
                                    !direction && "text-[#F4F7FF]"
                                )}
                            >
                                ${price.toFixed(2)}
                            </span>

                            {percent !== null && (
                                <span
                                    className={cn(
                                        "text-xs font-semibold px-2 py-0.5 rounded-full border",
                                        isUp
                                            ? "text-[#3DFFA0] bg-[#3DFFA0]/15 border-[#3DFFA0]/30"
                                            : "text-[#FF5470] bg-[#FF5470]/15 border-[#FF5470]/30"
                                    )}
                                >
                                    {isUp ? "+" : ""}{percent.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={`/stocks/${item.symbol}`}
                        className="p-2 text-xs font-semibold text-[#35D6FF] hover:text-[#3DFFA0] hover:bg-[#111B2E] rounded-xl transition border border-[rgba(53,214,255,0.2)]"
                        title="Open Deep Analysis"
                    >
                        Analyze
                    </Link>
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
            </div>

            {/* CHART SLOT */}
            <div className="rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#080D1B] overflow-hidden">
                {!expanded ? (
                    <div className="h-[120px]">
                        <MiniChart symbol={item.symbol} />
                    </div>
                ) : (
                    <FullChart symbol={item.symbol} />
                )}
            </div>

            {/* ACTION BAR */}
            <div className="flex items-center justify-between text-xs pt-1">
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="text-[#35D6FF] hover:text-[#7C5CFF] font-semibold transition"
                >
                    {expanded ? "Hide telemetry chart" : "Expand interactive chart"}
                </button>

                <span className="text-[#94A3B8] font-mono text-[11px]">Telemetry Alerts</span>
            </div>

            {/* ALERT INPUT */}
            <div className="flex items-center gap-2 pt-1">
                <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Alert target ($)"
                    className="w-36 px-3 py-1.5 rounded-xl bg-[#080D1B] border border-[rgba(148,163,184,0.18)] text-xs text-[#F4F7FF] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7C5CFF]"
                />

                <button
                    onClick={handleAddAlert}
                    disabled={loading}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-[#050816] text-xs font-bold hover:brightness-110 disabled:opacity-40 transition"
                >
                    {loading ? "Arming..." : "Arm Alert"}
                </button>
            </div>

            {/* ALERT LIST */}
            <WatchlistAlertList symbol={item.symbol} />

        </div>
    );
};

export default WatchlistRow;
