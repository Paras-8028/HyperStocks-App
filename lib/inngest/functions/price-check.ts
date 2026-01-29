import { inngest } from "@/lib/inngest/client";
import { AlertModel } from "@/database/models/alert.model";
import { getStockQuote } from "@/lib/actions/finnhub.actions";
import { sendAlertEmail } from "@/lib/nodemailer";
import { connectToDatabase } from "@/database/mongoose";

export const checkPriceAlerts = inngest.createFunction(
    { id: "price-alert-check" },
    { cron: "*/2 * * * *" },
    async () => {
        await connectToDatabase();

        const alerts = await AlertModel.find({ status: "active" });

        for (const alert of alerts) {
            const quote = await getStockQuote(alert.symbol);
            const currentPrice = quote.c;

            const hit =
                alert.condition === "above"
                    ? currentPrice >= alert.targetPrice
                    : currentPrice <= alert.targetPrice;

            if (!hit) continue;

            // Send email
            await sendAlertEmail({
                email: alert.userId, // see NOTE below
                symbol: alert.symbol,
                price: currentPrice,
                target: alert.targetPrice,
                condition: alert.condition,
            });

            // DELETE after trigger (your requirement)
            await AlertModel.deleteOne({ _id: alert._id });
        }
    }
);
