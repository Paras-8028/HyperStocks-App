"use client";

import { memo } from "react";

const MiniChart = ({ symbol }: { symbol: string }) => {
    return (
        <iframe
            key={symbol}
            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${symbol}&symbol=NASDAQ:${symbol}&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=141414&studies=[]&theme=dark&style=1&timezone=Etc/UTC`}
            className="w-full h-[120px] rounded-md border border-gray-800"
            style={{ background: "#141414" }}
            loading="lazy"
        />
    );
};

export default memo(MiniChart);
