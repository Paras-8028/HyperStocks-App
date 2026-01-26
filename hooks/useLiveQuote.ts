"use client";

import { useEffect, useState } from "react";

const socket = new WebSocket(
    `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
);

export function useLiveQuote(symbol: string) {
    const [price, setPrice] = useState<number | null>(null);
    const [percent, setPercent] = useState<number | null>(null);
    const [prev, setPrev] = useState<number | null>(null);

    useEffect(() => {
        socket.onopen = () => {
            socket.send(JSON.stringify({ type: "subscribe", symbol }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const trade = data?.data?.[0];
            if (!trade) return;

            setPrice(trade.p);
            if (prev) {
                setPercent(((trade.p - prev) / prev) * 100);
            }
            setPrev(trade.p);
        };

        return () => {
            socket.send(JSON.stringify({ type: "unsubscribe", symbol }));
        };
    }, [symbol, prev]);

    return { price, percent };
}
