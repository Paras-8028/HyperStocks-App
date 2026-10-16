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
