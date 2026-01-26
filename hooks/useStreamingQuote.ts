"use client";

import { useEffect, useState } from "react";
import { subscribe, unsubscribe } from "@/lib/finnhub/socket";

export function useStreamingQuote(symbol: string) {
    const [price, setPrice] = useState<number | null>(null);

    useEffect(() => {
        subscribe(symbol, setPrice);
        return () => unsubscribe(symbol);
    }, [symbol]);

    return price;
}
