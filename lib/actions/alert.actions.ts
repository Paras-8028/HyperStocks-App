"use server";

import { connectToDatabase } from "@/database/mongoose";
import { AlertModel } from "@/database/models/alert.model";
import { auth } from "@clerk/nextjs/server";

/* --------------------------------------------------
   Helper: get current user via Clerk
-------------------------------------------------- */
async function getCurrentUser() {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();
    return { userId };
}

/* --------------------------------------------------
   Create Alert
-------------------------------------------------- */
export async function createAlert(
    symbol: string,
    condition: "above" | "below",
    targetPrice: number
) {
    if (!symbol) throw new Error("Symbol is required");

    const { userId } = await getCurrentUser();

    await AlertModel.create({
        userId,
        symbol: symbol.toUpperCase(),
        condition,
        targetPrice,
        status: "active",
    });

    return { success: true };
}

export interface SerializedAlert {
    _id: string;
    id: string;
    userId: string;
    symbol: string;
    targetPrice: number;
    condition: "above" | "below";
    status: "active" | "triggered";
    triggeredAt?: string | null;
    createdAt?: string | null;
}

/* --------------------------------------------------
   Get Alerts for Symbol
-------------------------------------------------- */
export async function getAlertsBySymbol(symbol?: string): Promise<SerializedAlert[]> {
    if (!symbol || typeof symbol !== "string") {
        return [];
    }

    try {
        const { userId } = await getCurrentUser();

        const docs = await AlertModel.find({
            userId,
            symbol: symbol.toUpperCase(),
        })
            .sort({ createdAt: -1 })
            .lean();

        return docs.map((doc: any) => ({
            _id: String(doc._id),
            id: String(doc._id),
            userId: String(doc.userId),
            symbol: String(doc.symbol),
            targetPrice: Number(doc.targetPrice),
            condition: doc.condition === "below" ? "below" : "above",
            status: (doc.status === "triggered" ? "triggered" : "active") as "active" | "triggered",
            triggeredAt: doc.triggeredAt ? new Date(doc.triggeredAt).toISOString() : null,
            createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
        }));
    } catch (err) {
        console.error("getAlertsBySymbol error:", err);
        return [];
    }
}

/* --------------------------------------------------
   Delete Alert
-------------------------------------------------- */
export async function deleteAlert(alertId: string) {
    const { userId } = await getCurrentUser();

    await AlertModel.deleteOne({
        _id: alertId,
        userId,
    });

    return { success: true };
}

/* --------------------------------------------------
   Phase 3: Alert Preferences & Downside Risk Config
-------------------------------------------------- */
export async function getUserAlertPreferences() {
    const { userId } = await getCurrentUser();
    const { AlertPreferenceModel } = await import("@/database/models/alert_preference.model");
    const { DEFAULT_ALERT_PREFERENCES } = await import("@/types/alerts");

    const doc = await AlertPreferenceModel.findOne({ userId }).lean();
    if (!doc || !doc.preferences) {
        return {
            userId,
            preferences: DEFAULT_ALERT_PREFERENCES,
        };
    }

    return {
        userId,
        preferences: {
            ...DEFAULT_ALERT_PREFERENCES,
            ...doc.preferences,
        },
    };
}

export async function updateUserAlertPreferences(updates: {
    emailAlertsEnabled?: boolean;
    downsideRiskAlertsEnabled?: boolean;
    downsideRiskMinSeverity?: 'critical' | 'warning' | 'advisory';
    downsideRiskCooldownHours?: number;
    downsideRiskCategories?: {
        volatility_spike?: boolean;
        drawdown?: boolean;
        ma_breakdown?: boolean;
        var_exceedance?: boolean;
        historical_low?: boolean;
    };
    quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
    };
}) {
    const { userId } = await getCurrentUser();
    const { AlertPreferenceModel } = await import("@/database/models/alert_preference.model");
    const { DEFAULT_ALERT_PREFERENCES } = await import("@/types/alerts");

    // Server-side validation
    if (updates.downsideRiskMinSeverity) {
        if (!['critical', 'warning', 'advisory'].includes(updates.downsideRiskMinSeverity)) {
            throw new Error(`Invalid minimum severity: ${updates.downsideRiskMinSeverity}`);
        }
    }

    if (updates.downsideRiskCooldownHours !== undefined) {
        if (typeof updates.downsideRiskCooldownHours !== 'number' || updates.downsideRiskCooldownHours < 1 || updates.downsideRiskCooldownHours > 168) {
            throw new Error('Cooldown must be between 1 and 168 hours (1 week)');
        }
    }

    const currentDoc = await AlertPreferenceModel.findOne({ userId });
    const currentPrefs = currentDoc?.preferences || DEFAULT_ALERT_PREFERENCES;

    const mergedPreferences = {
        ...currentPrefs,
        ...updates,
        downsideRiskCategories: {
            ...currentPrefs.downsideRiskCategories,
            ...(updates.downsideRiskCategories || {}),
        },
        quietHours: {
            ...currentPrefs.quietHours,
            ...(updates.quietHours || {}),
        },
    };

    await AlertPreferenceModel.findOneAndUpdate(
        { userId },
        {
            $set: {
                preferences: mergedPreferences,
            },
        },
        { upsert: true, new: true }
    );

    return {
        success: true,
        preferences: mergedPreferences,
    };
}

