import { inngest } from "@/lib/inngest/client";
import { DownsideRiskAlertService } from "@/services/alerts/DownsideRiskAlertService";

/**
 * Inngest scheduled background job for quantitative downside risk monitoring.
 * Runs on market weekdays every 4 hours or on event trigger "app/monitor.downside.risk".
 */
export const monitorDownsideRiskAlerts = inngest.createFunction(
    { id: "downside-risk-monitoring" },
    [{ event: "app/monitor.downside.risk" }, { cron: "0 */4 * * 1-5" }],
    async ({ step }) => {
        const result = await step.run("evaluate-and-dispatch-watchlist-risk", async () => {
            return await DownsideRiskAlertService.evaluateAndDispatchWatchlistRisk();
        });

        return {
            success: true,
            evaluatedUsers: result.evaluatedUsersCount,
            evaluatedSymbols: result.evaluatedSymbolsCount,
            triggeredAlerts: result.triggeredAlertsCount,
            sentEmails: result.sentEmailsCount,
            skippedCooldown: result.skippedCooldownCount,
            skippedPreferences: result.skippedPreferenceCount,
            errors: result.errors,
        };
    }
);
