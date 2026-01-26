"use client";
import WatchlistRow from "./WatchlistRow";

const WatchlistTable = ({
                            items,
                        }: {
    items: { symbol: string; company: string }[];
}) => {
    return (
        <div className="space-y-6">
            {items.map((item) => (
                <WatchlistRow key={item.symbol} item={item} />
            ))}
        </div>
    );
};

export default WatchlistTable;
