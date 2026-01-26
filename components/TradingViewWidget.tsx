'use client';

import React, { memo } from 'react';
import useTradingViewWidget from "@/hooks/useTradingViewWidget";
import { cn } from "@/lib/utils";

interface TradingViewWidgetProps {
    title?: string;
    scriptUrl: string;
    config: Record<string, unknown>;
    height?: number;
    className?: string;
}

const TradingViewWidget = ({
                               title,
                               scriptUrl,
                               config,
                               height = 400,
                               className,
                           }: TradingViewWidgetProps) => {
    const containerRef = useTradingViewWidget(scriptUrl, config, height);

    return (
        <div className="w-full">
            {title && (
                <h3 className="text-lg font-semibold text-gray-100 mb-3">
                    {title}
                </h3>
            )}

            {/* IMPORTANT: container only */}
            <div
                ref={containerRef}
                className={cn(
                    "tradingview-widget-container rounded-lg overflow-hidden",
                    className
                )}
                style={{ height }}
            />
        </div>
    );
};

export default memo(TradingViewWidget);
