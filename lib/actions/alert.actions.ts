"use server";

import { connectToDatabase } from "@/database/mongoose";
import { AlertModel } from "@/database/models/alert.model";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";

/* --------------------------------------------------
   Helper: get current user
-------------------------------------------------- */
async function getCurrentUser() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const email = session?.user?.email;
    if (!email) throw new Error("Unauthorized");

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("DB not connected");

    const user = await db.collection("user").findOne({ email });
    if (!user) throw new Error("User not found");

    const userId = user.id || String(user._id);
    return { userId, email };
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
        triggered: false,
    });

    return { success: true };
}


/* --------------------------------------------------
   Get Alerts for Symbol
-------------------------------------------------- */
export async function getAlertsBySymbol(symbol?: string) {
    // ✅ HARD GUARD (this fixes crash)
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
   Delete Alert ✅ (THIS FIXES YOUR ERROR)
-------------------------------------------------- */
export async function deleteAlert(alertId: string) {
    const { userId } = await getCurrentUser();

    await AlertModel.deleteOne({
        _id: alertId,
        userId,
    });

    return { success: true };
}
