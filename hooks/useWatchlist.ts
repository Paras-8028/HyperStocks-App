'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    addToWatchlist,
    removeFromWatchlist,
    getUserWatchlist,
} from '@/lib/actions/watchlist.actions';

export interface WatchlistItem {
    _id?: string;
    symbol: string;
    company: string;
    addedAt?: Date;
}

const REFRESH_INTERVAL = 30_000; // 30 seconds

export function useWatchlist() {
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* ------------------------------------------------------------------ */
    /* Load Watchlist */
    /* ------------------------------------------------------------------ */

    const loadWatchlist = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getUserWatchlist();

            if (!res.success) {
                throw new Error(res.error);
            }

            setItems(res.data);
            setError(null);
        } catch (err) {
            console.error('useWatchlist load error:', err);
            setError('Failed to load watchlist');
        } finally {
            setLoading(false);
        }
    }, []);

    /* ------------------------------------------------------------------ */
    /* Add */
    /* ------------------------------------------------------------------ */

    const add = useCallback(
        async (symbol: string, company: string) => {
            const upper = symbol.toUpperCase();

            // Optimistic update
            setItems((prev) => [
                { symbol: upper, company, addedAt: new Date() },
                ...prev,
            ]);

            const res = await addToWatchlist(upper, company);

            if (!res.success) {
                // Rollback
                setItems((prev) => prev.filter((i) => i.symbol !== upper));
                setError(res.error || 'Failed to add');
            }
        },
        []
    );

    /* ------------------------------------------------------------------ */
    /* Remove */
    /* ------------------------------------------------------------------ */

    const remove = useCallback(async (symbol: string) => {
        const upper = symbol.toUpperCase();

        // Optimistic update
        const previous = items;
        setItems((prev) => prev.filter((i) => i.symbol !== upper));

        const res = await removeFromWatchlist(upper);

        if (!res.success) {
            // Rollback
            setItems(previous);
            setError(res.error || 'Failed to remove');
        }
    }, [items]);

    /* ------------------------------------------------------------------ */
    /* Helpers */
    /* ------------------------------------------------------------------ */

    const isInWatchlist = useCallback(
        (symbol: string) =>
            items.some((item) => item.symbol === symbol.toUpperCase()),
        [items]
    );

    /* ------------------------------------------------------------------ */
    /* Effects */
    /* ------------------------------------------------------------------ */

    useEffect(() => {
        loadWatchlist();

        const interval = setInterval(loadWatchlist, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [loadWatchlist]);

    /* ------------------------------------------------------------------ */
    /* API */
    /* ------------------------------------------------------------------ */

    return {
        items,
        loading,
        error,
        add,
        remove,
        isInWatchlist,
        refresh: loadWatchlist,
    };
}
