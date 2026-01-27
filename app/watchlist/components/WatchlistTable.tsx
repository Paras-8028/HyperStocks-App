"use client";

import { useState } from "react";
import WatchlistRow from "./WatchlistRow";

const WatchlistTable = ({
                            items,
                        }: {
    items: { symbol: string; company: string }[];
}) => {
    const [rows, setRows] = useState(items);

    const handleRemove = (symbol: string) => {
        setRows(prev => prev.filter(item => item.symbol !== symbol));
    };

    if (rows.length === 0) {
        return (
            <div className="text-center text-gray-500 py-10">
                Your watchlist is empty
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {rows.map(item => (
                <WatchlistRow
                    key={item.symbol}
                    item={item}
                    onRemove={handleRemove}
                />
            ))}
        </div>
    );
};

export default WatchlistTable;
