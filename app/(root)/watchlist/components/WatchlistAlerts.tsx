"use client";

import { useEffect, useState } from "react";
import {
    createAlert,
    deleteAlert,
    getAlertsBySymbol,
} from "@/lib/actions/alert.actions";
import { toast } from "sonner";

export default function WatchlistAlerts({
    symbol,
    symbols = [],
}: {
    symbol?: string;
    symbols?: string[];
}) {
    const symbolList = symbol ? [symbol] : symbols;
    const [selectedSymbol, setSelectedSymbol] = useState<string>(
        symbol || symbolList[0] || ""
    );
    const [alerts, setAlerts] = useState<any[]>([]);
    const [price, setPrice] = useState("");

    useEffect(() => {
        if (symbol) {
            setSelectedSymbol(symbol);
        } else if (symbols.length > 0 && !selectedSymbol) {
            setSelectedSymbol(symbols[0]);
        }
    }, [symbol, symbols, selectedSymbol]);

    const load = async () => {
        if (!selectedSymbol) return;
        const data = await getAlertsBySymbol(selectedSymbol);
        setAlerts(data || []);
    };

    useEffect(() => {
        load();
    }, [selectedSymbol]);

    const add = async () => {
        if (!selectedSymbol || !price || isNaN(Number(price))) {
            toast.error("Please enter a valid target price");
            return;
        }
        await createAlert(selectedSymbol, "above", Number(price));
        toast.success(`Alert created for ${selectedSymbol}`);
        setPrice("");
        load();
    };

    const remove = async (id: string) => {
        await deleteAlert(id);
        toast.success("Alert removed");
        load();
    };

    if (symbolList.length === 0) {
        return (
            <div className="text-gray-400 py-6">
                Add stocks to your watchlist to configure price alerts.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {symbolList.length > 1 && (
                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Select Stock:</label>
                    <select
                        value={selectedSymbol}
                        onChange={(e) => setSelectedSymbol(e.target.value)}
                        className="bg-gray-800 text-gray-200 text-sm rounded px-3 py-1.5 border border-gray-700 focus:outline-none focus:border-green-500"
                    >
                        {symbolList.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="flex gap-2">
                <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={`Target price for ${selectedSymbol || "stock"}`}
                    type="number"
                    step="any"
                    className="input flex-1 bg-gray-850 border border-gray-700 px-3 py-2 rounded text-gray-100"
                />
                <button onClick={add} className="yellow-btn px-4 py-2 font-medium">
                    Add Alert
                </button>
            </div>

            {alerts.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                    No active alerts for {selectedSymbol}.
                </p>
            ) : (
                <div className="space-y-2">
                    {alerts.map((a) => (
                        <div
                            key={a._id}
                            className="flex items-center justify-between text-sm bg-gray-800/80 border border-gray-700/60 px-3 py-2.5 rounded-lg"
                        >
                            <span className="font-medium text-gray-200">
                                {a.symbol}{" "}
                                <span className={a.condition === "above" ? "text-emerald-400" : "text-rose-400"}>
                                    {a.condition === "above" ? "▲ Above" : "▼ Below"}
                                </span>{" "}
                                ${a.targetPrice ?? a.price}
                            </span>

                            <button
                                onClick={() => remove(a._id)}
                                className="text-gray-400 hover:text-red-400 transition"
                                title="Remove alert"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
