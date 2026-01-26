"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WatchlistAlertItem({
                                               alert,
                                               onDelete,
                                           }: {
    alert: {
        _id: string;
        condition: "above" | "below";
        targetPrice: number;
        triggered: boolean;
    };
    onDelete: () => void;
}) {
    return (
        <div className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2">
            {/* Left: Alert info */}
            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300">
                    {alert.condition === "above" ? "↑ Above" : "↓ Below"}{" "}
                    <span className="font-semibold">
                        ${alert.targetPrice}
                    </span>
                </span>

                {/* Status badge */}
                <span
                    className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        alert.triggered
                            ? "bg-red-500/15 text-red-400"
                            : "bg-green-500/15 text-green-400"
                    )}
                >
                    {alert.triggered ? "Triggered" : "Active"}
                </span>
            </div>

            {/* Delete */}
            <button
                onClick={onDelete}
                title="Delete alert"
                className="text-gray-400 hover:text-red-500 transition"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}
