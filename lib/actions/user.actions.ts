'use server';

import { connectToDatabase } from "@/database/mongoose";
import { UserPreferenceModel, IUserPreferenceDocument } from "@/database/models/user_preference.model";
import { AlertPreferenceModel } from "@/database/models/alert_preference.model";
import { auth } from "@clerk/nextjs/server";
import {
    isValidIanaTimezone,
    isValidTimeFormat,
    isValidInterval,
    calculateNextDelivery,
    UserScheduleConfig,
} from "@/lib/utils/scheduling";

export interface NewsRecipientUser extends UserScheduleConfig {
    id: string;
    name: string;
}

/**
 * Canonical recipient discovery for scheduled news emails.
 * Uses UserPreferenceModel as canonical source of truth while gracefully backfilling
 * any legacy collection users who are not yet mirrored into UserPreferenceModel.
 */
export const getAllUsersForNewsEmail = async (): Promise<NewsRecipientUser[]> => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;

        // 1. Primary query: canonical UserPreferenceModel
        const canonicalPrefs = await UserPreferenceModel.find({
            newsEmailEnabled: { $ne: false },
            isSchedulePaused: { $ne: true },
            email: { $exists: true, $ne: '' },
        }).lean();

        const userMap = new Map<string, NewsRecipientUser>();

        for (const pref of canonicalPrefs) {
            if (!pref.email || !pref.email.includes('@')) continue;

            const recipient: NewsRecipientUser = {
                id: pref.userId,
                userId: pref.userId,
                email: pref.email.toLowerCase().trim(),
                name: pref.name || 'Investor',
                newsEmailEnabled: pref.newsEmailEnabled ?? true,
                timezone: pref.timezone || 'Asia/Kolkata',
                deliveryMode: (pref.deliveryMode as 'daily' | 'interval') || 'daily',
                preferredDeliveryTime: pref.preferredDeliveryTime || '08:00',
                scheduleIntervalMinutes: pref.scheduleIntervalMinutes || 240,
                deliveryDays: Array.isArray(pref.deliveryDays) && pref.deliveryDays.length > 0
                    ? pref.deliveryDays
                    : [1, 2, 3, 4, 5],
                isSchedulePaused: pref.isSchedulePaused ?? false,
                lastNewsDeliveryAt: pref.lastNewsDeliveryAt,
                nextNewsDeliveryAt: pref.nextNewsDeliveryAt,
            };

            userMap.set(pref.userId, recipient);
            userMap.set(recipient.email, recipient);
        }

        // 2. Legacy fallback: check legacy 'user' collection if available
        if (db) {
            try {
                const legacyUsers = await db.collection('user').find(
                    { email: { $exists: true, $ne: null } },
                    { projection: { _id: 1, id: 1, email: 1, name: 1 } }
                ).toArray();

                for (const legacyUser of legacyUsers) {
                    const email = legacyUser.email?.toLowerCase()?.trim();
                    const id = legacyUser.id || legacyUser._id?.toString() || '';
                    if (!email || !email.includes('@')) continue;

                    // If already loaded from UserPreferenceModel, skip
                    if (userMap.has(id) || userMap.has(email)) continue;

                    // Verify legacy user subscription status
                    const isSubscribed = await isUserSubscribedToDailyNews(email, id);
                    if (!isSubscribed) continue;

                    const newRecipient: NewsRecipientUser = {
                        id,
                        userId: id,
                        email,
                        name: legacyUser.name || 'Investor',
                        newsEmailEnabled: true,
                        timezone: 'Asia/Kolkata',
                        deliveryMode: 'daily',
                        preferredDeliveryTime: '08:00',
                        scheduleIntervalMinutes: 240,
                        deliveryDays: [1, 2, 3, 4, 5],
                        isSchedulePaused: false,
                    };

                    userMap.set(id, newRecipient);
                    userMap.set(email, newRecipient);

                    // Lazily mirror to UserPreferenceModel
                    try {
                        await UserPreferenceModel.updateOne(
                            { userId: id },
                            {
                                $setOnInsert: {
                                    userId: id,
                                    email,
                                    name: newRecipient.name,
                                    newsEmailEnabled: true,
                                    timezone: 'Asia/Kolkata',
                                    deliveryMode: 'daily',
                                    preferredDeliveryTime: '08:00',
                                    scheduleIntervalMinutes: 240,
                                    deliveryDays: [1, 2, 3, 4, 5],
                                    isSchedulePaused: false,
                                    createdAt: new Date(),
                                },
                            },
                            { upsert: true }
                        );
                    } catch {
                        // Ignore upsert collision
                    }
                }
            } catch (legacyErr) {
                console.warn('[getAllUsersForNewsEmail] Legacy user query skipped:', legacyErr);
            }
        }

        // Deduplicate distinct users by userId
        const distinctUsers = Array.from(
            new Map(Array.from(userMap.values()).map((u) => [u.userId, u])).values()
        );

        return distinctUsers;
    } catch (e) {
        console.error('[getAllUsersForNewsEmail] Error fetching users for news email:', e);
        return [];
    }
};

export async function isUserSubscribedToDailyNews(email: string, userId?: string): Promise<boolean> {
    try {
        await connectToDatabase();
        const query: any[] = [{ email: email.toLowerCase() }];
        if (userId) query.push({ userId });

        // Check UserPreferenceModel
        const userPref = await UserPreferenceModel.findOne({ $or: query }).lean();
        if (userPref) {
            if (userPref.newsEmailEnabled === false) return false;
            if (userPref.isSchedulePaused === true) return false;
            if (userPref.notificationPreferences?.dailyEmailBriefing === false) return false;
        }

        // Check AlertPreferenceModel
        if (userId) {
            const alertPref = await AlertPreferenceModel.findOne({ userId }).lean();
            if (alertPref && alertPref.preferences) {
                if (alertPref.preferences.emailDigest === false) {
                    return false;
                }
            }
        }

        return true;
    } catch (err) {
        console.warn('isUserSubscribedToDailyNews error, defaulting to subscribed:', err);
        return true;
    }
}

export async function unsubscribeUserFromDailyNews(emailOrUserId: string): Promise<boolean> {
    try {
        await connectToDatabase();
        const isEmail = emailOrUserId.includes('@');
        const filter = isEmail ? { email: emailOrUserId.toLowerCase() } : { userId: emailOrUserId };

        await UserPreferenceModel.findOneAndUpdate(
            filter,
            {
                $set: {
                    newsEmailEnabled: false,
                    isSchedulePaused: true,
                    'notificationPreferences.dailyEmailBriefing': false,
                },
            },
            { upsert: false }
        );

        if (!isEmail) {
            await AlertPreferenceModel.findOneAndUpdate(
                { userId: emailOrUserId },
                { $set: { 'preferences.emailDigest': false } },
                { upsert: false }
            );
        }

        return true;
    } catch (err) {
        console.error('unsubscribeUserFromDailyNews error:', err);
        return false;
    }
}

/**
 * Retrieve scheduling preferences for an authenticated user.
 */
export async function getUserSchedulingPreferences(userId: string) {
    try {
        await connectToDatabase();
        const doc = await UserPreferenceModel.findOne({ userId }).lean();
        if (!doc) {
            return {
                userId,
                newsEmailEnabled: true,
                timezone: 'Asia/Kolkata',
                deliveryMode: 'daily' as const,
                preferredDeliveryTime: '08:00',
                scheduleIntervalMinutes: 240,
                deliveryDays: [1, 2, 3, 4, 5],
                isSchedulePaused: false,
                lastNewsDeliveryAt: null,
                nextNewsDeliveryAt: null,
            };
        }

        return {
            userId: doc.userId,
            newsEmailEnabled: doc.newsEmailEnabled ?? true,
            timezone: doc.timezone || 'Asia/Kolkata',
            deliveryMode: (doc.deliveryMode as 'daily' | 'interval') || 'daily',
            preferredDeliveryTime: doc.preferredDeliveryTime || '08:00',
            scheduleIntervalMinutes: doc.scheduleIntervalMinutes || 240,
            deliveryDays: Array.isArray(doc.deliveryDays) ? doc.deliveryDays : [1, 2, 3, 4, 5],
            isSchedulePaused: doc.isSchedulePaused ?? false,
            lastNewsDeliveryAt: doc.lastNewsDeliveryAt ? doc.lastNewsDeliveryAt.toISOString() : null,
            nextNewsDeliveryAt: doc.nextNewsDeliveryAt ? doc.nextNewsDeliveryAt.toISOString() : null,
        };
    } catch (err) {
        console.error('[getUserSchedulingPreferences] Error:', err);
        throw new Error('Failed to load scheduling preferences');
    }
}

/**
 * Server-side validated update of scheduling preferences for an authenticated user.
 */
export async function updateUserSchedulingPreferences(
    userId: string,
    updates: {
        newsEmailEnabled?: boolean;
        timezone?: string;
        deliveryMode?: 'daily' | 'interval';
        preferredDeliveryTime?: string;
        scheduleIntervalMinutes?: number;
        deliveryDays?: number[];
        isSchedulePaused?: boolean;
    }
) {
    if (!userId) throw new Error('Unauthorized');
    const session = await auth().catch(() => null);
    if (session?.userId && session.userId !== userId) {
        throw new Error('Unauthorized: You cannot modify preferences for another user');
    }

    // Server-side validation
    const setPayload: Record<string, any> = {};

    if (updates.newsEmailEnabled !== undefined) {
        setPayload.newsEmailEnabled = Boolean(updates.newsEmailEnabled);
        // Sync legacy preference field
        setPayload['notificationPreferences.dailyEmailBriefing'] = Boolean(updates.newsEmailEnabled);
    }

    if (updates.timezone !== undefined) {
        if (!isValidIanaTimezone(updates.timezone)) {
            throw new Error(`Invalid IANA timezone: ${updates.timezone}`);
        }
        setPayload.timezone = updates.timezone.trim();
    }

    if (updates.deliveryMode !== undefined) {
        if (!['daily', 'interval'].includes(updates.deliveryMode)) {
            throw new Error(`Invalid delivery mode: ${updates.deliveryMode}`);
        }
        setPayload.deliveryMode = updates.deliveryMode;
    }

    if (updates.preferredDeliveryTime !== undefined) {
        if (!isValidTimeFormat(updates.preferredDeliveryTime)) {
            throw new Error(`Invalid delivery time format (expected HH:mm): ${updates.preferredDeliveryTime}`);
        }
        setPayload.preferredDeliveryTime = updates.preferredDeliveryTime.trim();
    }

    if (updates.scheduleIntervalMinutes !== undefined) {
        if (!isValidInterval(updates.scheduleIntervalMinutes)) {
            throw new Error(`Invalid interval (must be between 30 and 1440 minutes)`);
        }
        setPayload.scheduleIntervalMinutes = updates.scheduleIntervalMinutes;
    }

    if (updates.deliveryDays !== undefined) {
        if (!Array.isArray(updates.deliveryDays) || updates.deliveryDays.some((d) => d < 0 || d > 6)) {
            throw new Error('Invalid delivery days (must be an array of days 0-6)');
        }
        setPayload.deliveryDays = updates.deliveryDays;
    }

    if (updates.isSchedulePaused !== undefined) {
        setPayload.isSchedulePaused = Boolean(updates.isSchedulePaused);
    }

    await connectToDatabase();

    // Fetch existing document or create with defaults
    const currentDoc = await UserPreferenceModel.findOne({ userId });
    const mergedConfig: UserScheduleConfig = {
        userId,
        email: currentDoc?.email || '',
        newsEmailEnabled: setPayload.newsEmailEnabled ?? currentDoc?.newsEmailEnabled ?? true,
        timezone: setPayload.timezone ?? currentDoc?.timezone ?? 'Asia/Kolkata',
        deliveryMode: setPayload.deliveryMode ?? currentDoc?.deliveryMode ?? 'daily',
        preferredDeliveryTime: setPayload.preferredDeliveryTime ?? currentDoc?.preferredDeliveryTime ?? '08:00',
        scheduleIntervalMinutes: setPayload.scheduleIntervalMinutes ?? currentDoc?.scheduleIntervalMinutes ?? 240,
        deliveryDays: setPayload.deliveryDays ?? currentDoc?.deliveryDays ?? [1, 2, 3, 4, 5],
        isSchedulePaused: setPayload.isSchedulePaused ?? currentDoc?.isSchedulePaused ?? false,
        lastNewsDeliveryAt: currentDoc?.lastNewsDeliveryAt,
    };

    // Calculate next delivery time
    const nextDelivery = calculateNextDelivery(mergedConfig);
    setPayload.nextNewsDeliveryAt = nextDelivery;

    const updated = await UserPreferenceModel.findOneAndUpdate(
        { userId },
        { $set: setPayload },
        { new: true, upsert: true }
    );

    return {
        success: true,
        preferences: {
            userId: updated.userId,
            newsEmailEnabled: updated.newsEmailEnabled,
            timezone: updated.timezone,
            deliveryMode: updated.deliveryMode,
            preferredDeliveryTime: updated.preferredDeliveryTime,
            scheduleIntervalMinutes: updated.scheduleIntervalMinutes,
            deliveryDays: updated.deliveryDays,
            isSchedulePaused: updated.isSchedulePaused,
            lastNewsDeliveryAt: updated.lastNewsDeliveryAt ? updated.lastNewsDeliveryAt.toISOString() : null,
            nextNewsDeliveryAt: updated.nextNewsDeliveryAt ? updated.nextNewsDeliveryAt.toISOString() : null,
        },
    };
}
