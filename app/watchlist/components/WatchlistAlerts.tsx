"use client";

import { useEffect, useState } from "react";
import { createAlert, deleteAlert, getAlertsBySymbol } from "@/lib/actions/alert.actions";
import { toast } from "sonner";
import WatchlistAlertItem from "./WatchlistAlertItem";

export default function WatchlistAlerts({ symbol }: { symbol: string }) {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [price, setPrice] = useState("");
    const [condition, setCondition] = useState<"above" | "below">("above");
    const [loading, setLoading] = useState(false);

    const loadAlerts = async () => {
        const data = await getAlertsBySymbol(symbol);
        setAlerts(data || []);
    };

    useEffect(() => {
        loadAlerts();
    }, [symbol]);

    const create = async () => {
        if (!price) return;

        try {
            setLoading(true);
            await createAlert(symbol, condition, Number(price));
            toast.success("Alert created");
            setPrice("");
            await loadAlerts();
        } catch {
            toast.error("Failed to create alert");
        } finally {
            setLoading(false);
        }
    };

    const remove = async (id: string) => {
        await deleteAlert(id);
        await loadAlerts();
    };

    return (
        <div className="space-y-4">
            {/* Existing alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map(alert => (
                        <WatchlistAlertItem
                            key={alert._id}
                            alert={alert}
                            onDelete={() => remove(alert._id)}
                        />
                    ))}
                </div>
            )}

            {/* Create alert */}
            <div className="flex gap-2">
                <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="input w-24"
                >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                </select>

                <input
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="input w-32"
                />

                <button
                    onClick={create}
                    disabled={loading}
                    className="yellow-btn"
                >
                    Add Alert
                </button>
            </div>
        </div>
    );
}
