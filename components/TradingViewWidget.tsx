"use client";

import useTradingViewWidget from "@/hooks/useTradingViewWidget";

const TradingViewWidget = ({
                               scriptUrl,
                               config,
                               height,
                           }: {
    scriptUrl: string;
    config: Record<string, any>;
    height: number;
}) => {
    const ref = useTradingViewWidget(scriptUrl, config, height);

    return (
        <div
            className="w-full rounded-lg overflow-hidden"
            style={{ height }}
        >
            <div ref={ref} className="w-full h-full" />
        </div>
    );
};

export default TradingViewWidget;
