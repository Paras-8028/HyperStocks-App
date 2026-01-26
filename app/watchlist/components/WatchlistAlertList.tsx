"use client";

import { useEffect, useState } from "react";
import { getAlertsBySymbol, deleteAlert } from "@/lib/actions/alert.actions";

export default function WatchlistAlertList({ symbol }: { symbol: string }) {
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        getAlertsBySymbol(symbol).then(setAlerts);
    }, [symbol]);

    if (!alerts.length) return null;

    return (
        <div className="mt-3 space-y-2">
            {alerts.map(alert => (
                <div
                    key={alert._id}
                    className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-md text-sm"
                >
          <span>
            {alert.condition === "above" ? "↑" : "↓"} ${alert.price}
          </span>

                    <span
                        className={alert.triggered ? "text-red-400" : "text-green-400"}
                    >
            {alert.triggered ? "Triggered" : "Active"}
          </span>

                    <button
                        onClick={() => {
                            deleteAlert(alert._id);
                            setAlerts(prev => prev.filter(a => a._id !== alert._id));
                        }}
                        className="text-gray-400 hover:text-red-400"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
