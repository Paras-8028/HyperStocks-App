import { inngest } from "@/lib/inngest/client";
import { AlertNotificationEngine } from "@/services/alerts";

export const checkPriceAlerts = inngest.createFunction(
    { id: "price-alert-check" },
    { cron: "*/2 * * * *" },
    async () => {
        const result = await AlertNotificationEngine.processActivePriceAlerts();
        return {
            success: true,
            evaluated: result.evaluatedCount,
            triggered: result.triggeredCount,
            emailsSent: result.emailsSentCount,
            emailsSkipped: result.emailsSkippedCount,
            errors: result.errors,
        };
    }
);
