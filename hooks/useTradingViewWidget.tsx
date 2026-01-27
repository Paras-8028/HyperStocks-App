"use client";

import { useEffect, useRef } from "react";

export default function useTradingViewWidget(
    scriptUrl: string,
    config: Record<string, unknown>
) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // prevent duplicate widgets
        if (container.childNodes.length > 0) return;

        const script = document.createElement("script");
        script.src = scriptUrl;
        script.type = "text/javascript";
        script.async = true;

        // 🔥 CRITICAL: stringify BEFORE append
        script.innerHTML = JSON.stringify(config);

        container.appendChild(script);

        return () => {
            container.innerHTML = "";
        };
    }, [scriptUrl]); // ❗ DO NOT depend on config

    return containerRef;
}
