'use server';

import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { auth } from '@/lib/better-auth/auth';

const MAX_WATCHLIST_ITEMS = 50;

/* =====================================================
   Helper: resolve current logged-in user
===================================================== */
async function resolveCurrentUser() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const email = session?.user?.email;
    if (!email) throw new Error('Unauthorized');

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    const user = await db.collection('user').findOne({ email });
    if (!user) throw new Error('User not found');

    const userId = user.id || String(user._id);
    if (!userId) throw new Error('Invalid user id');

    return { userId, email };
}

/* =====================================================
   READ
===================================================== */

/** Used for syncing ⭐ state in search results */
export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('MongoDB connection not found');

        const user = await db.collection('user').findOne({ email });
        if (!user) return [];

        const userId = user.id || String(user._id);
        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();

        return items.map(i => String(i.symbol));
    } catch (err) {
        console.error('getWatchlistSymbolsByEmail error:', err);
        return [];
    }
}

/** Used by /watchlist page */
export async function getUserWatchlist(email: string) {
    if (!email) return [];

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error("MongoDB connection not found");

        const user = await db.collection("user").findOne({ email });
        if (!user) return [];

        const userId = user.id || String(user._id);

        // ✅ IMPORTANT: use .lean() to get plain objects
        const items = await Watchlist.find({ userId })
            .sort({ addedAt: -1 })
            .lean();

        // ✅ MANUAL SERIALIZATION (critical)
        return items.map((item) => ({
            id: String(item._id),        // serialize ObjectId
            symbol: item.symbol,
            company: item.company,
            addedAt: item.addedAt
                ? new Date(item.addedAt).toISOString()
                : null,
        }));
    } catch (err) {
        console.error("getUserWatchlist error:", err);
        return [];
    }
}


/* =====================================================
   WRITE
===================================================== */

export async function addToWatchlist(symbol: string, company: string) {
    try {
        const { userId } = await resolveCurrentUser();

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
        // Duplicate symbol (unique index)
        if (err?.code === 11000) {
            return { success: true };
        }

        console.error('addToWatchlist error:', err);
        return { success: false, error: 'Failed to add to watchlist' };
    }
}

export async function removeFromWatchlist(symbol: string) {
    try {
        const { userId } = await resolveCurrentUser();

        await Watchlist.deleteOne({
            userId,
            symbol: symbol.toUpperCase(),
        });

        return { success: true };
    } catch (err) {
        console.error('removeFromWatchlist error:', err);
        return { success: false, error: 'Failed to remove from watchlist' };
    }
}

/* =====================================================
   TOGGLE (used by ⭐ button)
===================================================== */
export async function toggleWatchlist(
    symbol: string,
    company: string
): Promise<{ added: boolean }> {
    const { userId } = await resolveCurrentUser(); // ✅ FIXED

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
        throw new Error(`Watchlist limit reached (${MAX_WATCHLIST_ITEMS})`);
    }

    await Watchlist.create({
        userId,
        symbol: normalized,
        company,
    });

    return { added: true };
}


