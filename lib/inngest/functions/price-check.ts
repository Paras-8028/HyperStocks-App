import { inngest } from "@/lib/inngest/client";
import { connectToDatabase } from "@/database/mongoose";
import { AlertModel } from "@/database/models/alert.model";
import { fetchJSON } from "@/lib/actions/finnhub.actions";
import { sendAlertEmail } from "@/lib/nodemailer";

export const checkPriceAlerts = inngest.createFunction(
    { id: "price-alert-checker" },
    { cron: "*/5 * * * *" }, // every 5 minutes
    async () => {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db!;
        const alerts = await AlertModel.find({ triggered: false });

        for (const alert of alerts) {
            const data = await fetchJSON<any>(
                `https://finnhub.io/api/v1/quote?symbol=${alert.symbol}&token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
            );

            const currentPrice = data?.c;
            if (!currentPrice) continue;

            const shouldTrigger =
                (alert.condition === "above" &&
                    currentPrice >= alert.targetPrice) ||
                (alert.condition === "below" &&
                    currentPrice <= alert.targetPrice);

            if (!shouldTrigger) continue;

            // Mark alert as triggered
            alert.triggered = true;
            await alert.save();

            // Get user email
            const user = await db
                .collection("user")
                .findOne({ id: alert.userId });

            if (!user?.email) continue;

            // Send alert email
            await sendAlertEmail({
                email: user.email,
                symbol: alert.symbol,
                price: currentPrice,
                target: alert.targetPrice,
                condition: alert.condition,
            });
        }

        return { success: true };
    }
);
