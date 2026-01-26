"use client";

import { memo } from "react";
import useTradingViewWidget from "@/hooks/useTradingViewWidget";

const MiniChart = ({ symbol }: { symbol: string }) => {
    const ref = useTradingViewWidget(
        "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js",
        {
            symbol: `NASDAQ:${symbol}`,
            locale: "en",
            dateRange: "1M",
            colorTheme: "dark",
            isTransparent: true,
            autosize: true,
        },
        120
    );

    return <div ref={ref} className="w-full h-[120px]" />;
};

export default memo(MiniChart);
