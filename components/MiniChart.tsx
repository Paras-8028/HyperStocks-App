"use client";

import useTradingViewWidget from "@/hooks/useTradingViewWidget";

export default function MiniChart({ symbol }: { symbol: string }) {
    const ref = useTradingViewWidget(
        "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js",
        {
            symbol: `NASDAQ:${symbol}`,
            locale: "en",
            dateRange: "1M",
            colorTheme: "dark",
            isTransparent: true,
            autosize: true,
        }
    );

    return <div ref={ref} className="w-full h-[120px]" />;
}
