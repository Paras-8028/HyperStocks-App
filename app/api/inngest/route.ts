import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { sendSignUpEmail, sendDailyNewsSummary } from "@/lib/inngest/functions";
import { checkPriceAlerts } from "@/lib/inngest/functions/price-check";
import { monitorDownsideRiskAlerts } from "@/lib/inngest/functions/downside-risk";
import { collectNewsAndSentiment } from "@/lib/inngest/functions/news-collector";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        sendSignUpEmail,
        sendDailyNewsSummary,
        checkPriceAlerts,
        monitorDownsideRiskAlerts,
        collectNewsAndSentiment,
    ],
});


