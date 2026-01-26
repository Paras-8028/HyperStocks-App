"use client";

import { memo } from "react";
import useTradingViewWidget from "@/hooks/useTradingViewWidget";
import { cn } from "@/lib/utils";

interface Props {
    scriptUrl: string;
    config: Record<string, unknown>;
    height?: number;
    className?: string;
}

const TradingViewWidget = ({
                               scriptUrl,
                               config,
                               height = 360,
                               className,
                           }: Props) => {
    const ref = useTradingViewWidget(scriptUrl, config, height);

    return (
        <div
            ref={ref}
            className={cn(
                "tradingview-widget-container w-full",
                className
            )}
            style={{ height }}
        />
    );
};

export default memo(TradingViewWidget);
