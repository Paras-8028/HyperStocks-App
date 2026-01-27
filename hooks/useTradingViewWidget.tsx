"use client";
import { useEffect, useRef } from "react";

declare global {
    interface Window {
        TradingView: any;
    }
}

const useTradingViewWidget = (
    scriptUrl: string,
    config: Record<string, any>,
    height: number
) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        ref.current.innerHTML = "";
        const id = `tv-${Math.random()}`;
        ref.current.id = id;

        const script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;

        script.onload = () => {
            if (!window.TradingView) return;

            new window.TradingView.widget({
                container_id: id,
                width: "100%",
                height,
                ...config,
            });
        };

        document.body.appendChild(script);

        return () => {
            ref.current && (ref.current.innerHTML = "");
        };
    }, [scriptUrl, height, JSON.stringify(config)]);

    return ref;
};

export default useTradingViewWidget;
