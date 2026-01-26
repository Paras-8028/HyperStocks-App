"use client";
import { memo } from "react";
import useTradingViewWidget from "@/hooks/useTradingViewWidget";
import { cn } from "@/lib/utils";

interface TradingViewWidgetProps {
    scriptUrl: string;
    config: Record<string, unknown>;
    height: number;
    className?: string;
}

const TradingViewWidget = ({
                               scriptUrl,
                               config,
                               height,
                               className,
                           }: TradingViewWidgetProps) => {
    const ref = useTradingViewWidget(scriptUrl, config, height);

    return (
        <div
            ref={ref}
            className={cn(
                "tradingview-widget-container w-full overflow-hidden rounded-lg",
                className
            )}
        />
    );
};

export default memo(TradingViewWidget);
