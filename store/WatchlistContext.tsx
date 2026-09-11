'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useWatchlist, WatchlistItem } from '@/hooks/useWatchlist';

interface WatchlistContextValue {
    items: WatchlistItem[];
    loading: boolean;
    error: string | null;
    isInWatchlist: (symbol: string) => boolean;
    add: (symbol: string, company: string) => Promise<void>;
    remove: (symbol: string) => Promise<void>;
    refresh: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextValue | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
    const watchlist = useWatchlist();

    return (
        <WatchlistContext.Provider value={watchlist}>
            {children}
        </WatchlistContext.Provider>
    );
}

export function useWatchlistStore(): WatchlistContextValue {
    const context = useContext(WatchlistContext);
    if (!context) {
        throw new Error('useWatchlistStore must be used within a WatchlistProvider');
    }
    return context;
}
