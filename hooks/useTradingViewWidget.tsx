"use client";
import { useEffect, useRef } from "react";

const useTradingViewWidget = (
    scriptUrl: string,
    config: Record<string, unknown>,
    height: number
) => {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        // Clear previous widget safely
        ref.current.innerHTML = "";

        const widget = document.createElement("div");
        widget.className = "tradingview-widget-container__widget";
        widget.style.width = "100%";
        widget.style.height = `${height}px`;

        const script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.type = "text/javascript";
        script.innerHTML = JSON.stringify(config);

        ref.current.appendChild(widget);
        ref.current.appendChild(script);

        return () => {
            if (ref.current) {
                ref.current.innerHTML = "";
            }
        };
    }, [scriptUrl, JSON.stringify(config), height]);

    return ref;
};

export default useTradingViewWidget;
