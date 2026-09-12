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

/* --------------------------------------------------
   Get Alerts for Symbol
-------------------------------------------------- */
export async function getAlertsBySymbol(symbol?: string) {
    if (!symbol || typeof symbol !== "string") {
        return [];
    }

    const { userId } = await getCurrentUser();

    return await AlertModel.find({
        userId,
        symbol: symbol.toUpperCase(),
    }).sort({ createdAt: -1 });
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
