'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { auth } from '@clerk/nextjs/server';

const MAX_WATCHLIST_ITEMS = 50;

/* =====================================================
   Helper: resolve current logged-in user via Clerk
===================================================== */
async function resolveCurrentUser(): Promise<{ userId: string }> {
    const { userId } = await auth();

    if (!userId) {
        throw new Error('Unauthorized');
    }

    return { userId };
}

/* =====================================================
   READ
===================================================== */

/** Direct lookup by Clerk userId */
export async function getWatchlistSymbolsByUserId(userId: string): Promise<string[]> {
    if (!userId) return [];

    try {
        await connectToDatabase();
        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
        return items.map((i) => String(i.symbol));
    } catch (err) {
        console.error('getWatchlistSymbolsByUserId error:', err);
        return [];
    }
}

/** Used for syncing ⭐ state in search results */
export async function getWatchlistSymbolsByEmail(emailOrUserId: string): Promise<string[]> {
    if (!emailOrUserId) return [];

    // If it's already a Clerk user ID
    if (!emailOrUserId.includes('@')) {
        return getWatchlistSymbolsByUserId(emailOrUserId);
    }

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) return [];

        const user = await db.collection('user').findOne({ email: emailOrUserId });
        if (!user) return [];

        const userId = user.id || String(user._id);
        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();

        return items.map((i) => String(i.symbol));
    } catch (err) {
        console.error('getWatchlistSymbolsByEmail error:', err);
        return [];
    }
}

/** Used by /watchlist page */
export async function getUserWatchlist(emailOrUserId?: string) {
    try {
        let userId = emailOrUserId;

        if (!userId) {
            const current = await resolveCurrentUser().catch(() => null);
            userId = current?.userId;
        }

        if (!userId) return [];

        await connectToDatabase();

        // If email was provided, check legacy user collection
        if (userId.includes('@')) {
            const mongoose = await connectToDatabase();
            const db = mongoose.connection.db;
            if (db) {
                const user = await db.collection('user').findOne({ email: userId });
                if (user) userId = user.id || String(user._id);
            }
        }

        const items = await Watchlist.find({ userId })
            .sort({ addedAt: -1 })
            .lean();

        return items.map((item) => ({
            id: String(item._id),
            symbol: item.symbol,
            company: item.company,
            addedAt: item.addedAt ? new Date(item.addedAt).toISOString() : null,
        }));
    } catch (err) {
        console.error('getUserWatchlist error:', err);
        return [];
    }
}

/* =====================================================
   WRITE
===================================================== */

export async function addToWatchlist(symbol: string, company: string) {
    try {
        const { userId } = await resolveCurrentUser();
        await connectToDatabase();

        const count = await Watchlist.countDocuments({ userId });
        if (count >= MAX_WATCHLIST_ITEMS) {
            return {
                success: false,
                error: `Watchlist limit reached (${MAX_WATCHLIST_ITEMS})`,
            };
        }

        await Watchlist.create({
            userId,
            symbol: symbol.toUpperCase(),
            company,
        });

        return { success: true };
    } catch (err: any) {
        if (err?.code === 11000) {
            return { success: true };
        }

        console.error('addToWatchlist error:', err);
        return { success: false, error: 'Failed to add to watchlist' };
    }
}

/* =====================================================
   REMOVE FROM WATCHLIST
===================================================== */
export async function removeFromWatchlist(symbol: string) {
    try {
        const { userId } = await resolveCurrentUser();
        await connectToDatabase();

        await Watchlist.deleteOne({
            userId,
            symbol: symbol.toUpperCase(),
        });

        return { success: true };
    } catch (err) {
        console.error('removeFromWatchlist error:', err);
        throw new Error('Failed to remove from watchlist');
    }
}

/* =====================================================
   TOGGLE WATCHLIST ⭐
===================================================== */
export async function toggleWatchlist(
    symbol: string,
    company: string
): Promise<{ added: boolean }> {
    const { userId } = await resolveCurrentUser();
    await connectToDatabase();

    const normalized = symbol.toUpperCase();

    const existing = await Watchlist.findOne({
        userId,
        symbol: normalized,
    });

    if (existing) {
        await Watchlist.deleteOne({ _id: existing._id });
        return { added: false };
    }

    const count = await Watchlist.countDocuments({ userId });
    if (count >= MAX_WATCHLIST_ITEMS) {
        throw new Error('Watchlist limit reached (50)');
    }

    await Watchlist.create({
        userId,
        symbol: normalized,
        company,
    });

    return { added: true };
}
