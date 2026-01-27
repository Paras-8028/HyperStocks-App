"use client";

import { useEffect, useRef, useState } from "react";
import { finnhubWS } from "@/lib/finnhub/ws";

export function useLiveQuote(symbol: string) {
    const [price, setPrice] = useState<number | null>(null);
    const [percent, setPercent] = useState<number | null>(null);
    const [direction, setDirection] = useState<"up" | "down" | null>(null);

    const lastPrice = useRef<number | null>(null);

    useEffect(() => {
        if (!symbol) return;

        const unsubscribe = finnhubWS.subscribe(symbol, ({ price }) => {
            setPrice(prev => {
                if (prev !== null) {
                    setDirection(price > prev ? "up" : "down");
                    setPercent(((price - prev) / prev) * 100);
                }
                lastPrice.current = price;
                return price;
            });
        });

        return unsubscribe;
    }, [symbol]);

    return { price, percent, direction };
}
