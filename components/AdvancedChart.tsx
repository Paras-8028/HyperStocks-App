"use client";

import { useEffect, useRef } from "react";

export default function AdvancedChart({ symbol }: { symbol: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        containerRef.current.innerHTML = "";

        const script = document.createElement("script");
        script.src =
            "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.async = true;

        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol: `NASDAQ:${symbol}`,
            interval: "D",
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "en",
            hide_top_toolbar: true,
            allow_symbol_change: false,
            save_image: false,
            backgroundColor: "#0b0b0b",
        });

        containerRef.current.appendChild(script);
    }, [symbol]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full tradingview-widget-container"
        />
    );
}
