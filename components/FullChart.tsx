"use client";

import useTradingViewWidget from "@/hooks/useTradingViewWidget";

const FullChart = ({ symbol }: { symbol: string }) => {
    const ref = useTradingViewWidget(
        "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
        {
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
        }
    );

    return <div ref={ref} className="h-[360px] w-full" />;
};

export default FullChart;
