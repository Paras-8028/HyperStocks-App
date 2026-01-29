"use client";

import { deleteAlert } from "@/lib/actions/alert.actions";

export default function WatchlistAlertItem({ alert }: any) {
    return (
        <div className="flex justify-between items-center bg-gray-800 p-3 rounded">
            <div>
                <div className="text-sm text-gray-200">
                    {alert.condition === "above" ? "Above" : "Below"} $
                    {alert.targetPrice}
                </div>

                <span
                    className={`text-xs px-2 py-1 rounded ${
                        alert.status === "active"
                            ? "bg-green-600/20 text-green-400"
                            : "bg-red-600/20 text-red-400"
                    }`}
                >
          {alert.status}
        </span>
            </div>

            <button
                onClick={() => deleteAlert(alert._id)}
                className="text-red-400 hover:underline text-sm"
            >
                Delete
            </button>
        </div>
    );
}
