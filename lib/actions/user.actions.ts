'use server';

import { connectToDatabase } from "@/database/mongoose";
import { UserPreferenceModel } from "@/database/models/user_preference.model";
import { AlertPreferenceModel } from "@/database/models/alert_preference.model";

export const getAllUsersForNewsEmail = async () => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('Mongoose connection not connected');

        const users = await db.collection('user').find(
            { email: { $exists: true, $ne: null } },
            { projection: { _id: 1, id: 1, email: 1, name: 1, country: 1 } }
        ).toArray();

        const validUsers = users.filter((user) => user.email && user.name).map((user) => ({
            id: user.id || user._id?.toString() || '',
            email: user.email,
            name: user.name
        }));

        // Filter out unsubscribed users based on UserPreference and AlertPreference
        const eligibleUsers = [];
        for (const user of validUsers) {
            const isSubscribed = await isUserSubscribedToDailyNews(user.email, user.id);
            if (isSubscribed) {
                eligibleUsers.push(user);
            }
        }

        return eligibleUsers;
    } catch (e) {
        console.error('Error fetching users for news email:', e);
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
        if (userPref && userPref.notificationPreferences) {
            if (userPref.notificationPreferences.dailyEmailBriefing === false) {
                return false;
            }
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
            { $set: { 'notificationPreferences.dailyEmailBriefing': false } },
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
