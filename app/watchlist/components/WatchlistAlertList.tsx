"use client";

import { useEffect, useState } from "react";
import { getAlertsBySymbol } from "@/lib/actions/alert.actions";
import WatchlistAlertItem from "./WatchlistAlertItem";

export default function WatchlistAlertList({
                                               symbol,
                                           }: {
    symbol: string;
}) {
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        getAlertsBySymbol(symbol).then(setAlerts);
    }, [symbol]);

    if (alerts.length === 0)
        return (
            <div className="text-sm text-gray-500">
                No alerts
            </div>
        );

    return (
        <div className="space-y-2">
            {alerts.map((a) => (
                <WatchlistAlertItem key={a._id} alert={a} />
            ))}
        </div>
    );
}
