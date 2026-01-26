"use client";

import { useEffect, useRef, useState } from "react";

export function useLiveQuote(symbol: string) {
    const [price, setPrice] = useState<number | null>(null);
    const [percent, setPercent] = useState<number | null>(null);
    const [direction, setDirection] = useState<"up" | "down" | null>(null);

    const prevPrice = useRef<number | null>(null);

    useEffect(() => {
        if (!symbol) return;

        let active = true;

        async function fetchQuote() {
            const res = await fetch(`/api/quote?symbol=${symbol}`);
            const data = await res.json();

            if (!active) return;

            const newPrice = data.price;

            if (prevPrice.current !== null) {
                if (newPrice > prevPrice.current) setDirection("up");
                if (newPrice < prevPrice.current) setDirection("down");

                setTimeout(() => setDirection(null), 600);
            }

            prevPrice.current = newPrice;
            setPrice(newPrice);
            setPercent(data.percent);
        }

        fetchQuote();
        const id = setInterval(fetchQuote, 30000);

        return () => {
            active = false;
            clearInterval(id);
        };
    }, [symbol]);

    return { price, percent, direction };
}
