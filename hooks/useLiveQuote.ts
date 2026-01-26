"use client";

import { useEffect, useState } from "react";
import { getStockQuote } from "@/lib/actions/finnhub.actions";

export function useLiveQuote(symbol: string) {
    const [price, setPrice] = useState<number | null>(null);
    const [change, setChange] = useState<number | null>(null);
    const [percent, setPercent] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchQuote = async () => {
        try {
            const data = await getStockQuote(symbol);
            setPrice(data.c);
            setChange(data.d);
            setPercent(data.dp);
        } catch (e) {
            console.error("Quote fetch failed:", symbol);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuote();

        const interval = setInterval(fetchQuote, 30_000);
        return () => clearInterval(interval);
    }, [symbol]);

    return { price, change, percent, loading };
}
