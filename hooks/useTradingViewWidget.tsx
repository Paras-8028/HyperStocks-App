'use client';

import { useEffect, useRef } from "react";

const useTradingViewWidget = (
    scriptUrl: string,
    config: Record<string, unknown>,
    height = 360
) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clear previous widget
        containerRef.current.innerHTML = "";

        const script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.type = "text/javascript";
        script.innerHTML = JSON.stringify(config);

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };
    }, [scriptUrl, JSON.stringify(config), height]);

    return containerRef;
};

export default useTradingViewWidget;
