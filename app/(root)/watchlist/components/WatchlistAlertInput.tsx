"use client";

import { useState } from "react";
import { createAlert } from "@/lib/actions/alert.actions";
import { toast } from "sonner";

export default function WatchlistAlertInput({
                                                symbol,
                                            }: {
    symbol: string;
}) {
    const [price, setPrice] = useState("");
    const [condition, setCondition] =
        useState<"above" | "below">("above");

    const submit = async () => {
        if (!price) return;

        await createAlert(symbol, condition, Number(price));
        toast.success("Alert added");
        setPrice("");
    };

    return (
        <div className="flex items-center gap-2">
            <select
                value={condition}
                onChange={(e) =>
                    setCondition(e.target.value as any)
                }
                className="bg-black border border-gray-700 text-sm rounded px-2 py-2"
            >
                <option value="above">Above</option>
                <option value="below">Below</option>
            </select>

            <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Target"
                className="w-28 px-3 py-2 bg-black border border-gray-700 text-sm rounded"
            />

            <button
                onClick={submit}
                className="px-3 py-2 bg-green-500 text-black rounded text-sm font-medium"
            >
                Add
            </button>
        </div>
    );
}
