"use client";

import { useEffect, useState } from "react";
import {
    createAlert,
    deleteAlert,
    getAlertsBySymbol,
} from "@/lib/actions/alert.actions";
import { toast } from "sonner";

export default function WatchlistAlerts({ symbol }: { symbol: string }) {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [price, setPrice] = useState("");

    const load = async () => {
        const data = await getAlertsBySymbol(symbol);
        setAlerts(data);
    };

    useEffect(() => {
        load();
    }, [symbol]);

    const add = async () => {
        await createAlert(symbol, "above", Number(price));
        toast.success("Alert created");
        setPrice("");
        load();
    };

    const remove = async (id: string) => {
        await deleteAlert(id);
        toast.success("Alert removed");
        load();
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Target price"
                    className="input flex-1"
                />
                <button onClick={add} className="yellow-btn">
                    Add
                </button>
            </div>

            {alerts.map((a) => (
                <div
                    key={a._id}
                    className="flex justify-between text-sm bg-gray-800 px-3 py-2 rounded"
                >
                    <span>
                        {a.condition === "above" ? "▲" : "▼"} ${a.price}
                    </span>

                    <button
                        onClick={() => remove(a._id)}
                        className="text-red-400"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
