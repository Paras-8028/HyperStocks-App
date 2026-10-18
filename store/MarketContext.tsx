'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { StockQuote } from '@/types/market';

interface MarketContextValue {
    quotes: Record<string, StockQuote>;
    updateQuote: (quote: StockQuote) => void;
    activeSymbol: string | null;
    setActiveSymbol: (symbol: string | null) => void;
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

export function MarketProvider({ children }: { children: ReactNode }) {
    const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
    const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

    const updateQuote = useCallback((quote: StockQuote) => {
        setQuotes((prev) => ({
            ...prev,
            [quote.symbol.toUpperCase()]: quote,
        }));
    }, []);

    return (
        <MarketContext.Provider
            value={{
                quotes,
                updateQuote,
                activeSymbol,
                setActiveSymbol,
            }}
        >
            {children}
        </MarketContext.Provider>
    );
}

export function useMarketStore(): MarketContextValue {
    const context = useContext(MarketContext);
    if (!context) {
        throw new Error('useMarketStore must be used within a MarketProvider');
    }
    return context;
}
