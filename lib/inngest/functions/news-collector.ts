import { inngest } from "@/lib/inngest/client";
import { NewsSentimentCollectorService } from "@/services/news/NewsSentimentCollectorService";

/**
 * Inngest scheduled background job for automated news and sentiment collection.
 * Runs on market weekdays every 2 hours (cron: 0 star/2 star star 1-5) or on event trigger "app/collect.news.sentiment".
 * Collects incoming news, performs point-in-time sentiment analysis, and persists records
 * with full provenance tracking.
 */
export const collectNewsAndSentiment = inngest.createFunction(
    {
        id: "news-sentiment-collection",
        retries: 2,
    },
    [{ event: "app/collect.news.sentiment" }, { cron: "0 */2 * * 1-5" }],
    async ({ event, step }) => {
        const explicitSymbols = event?.data?.symbols as string[] | undefined;

        const summary = await step.run("run-news-and-sentiment-collection", async () => {
            return await NewsSentimentCollectorService.runCollection(explicitSymbols, {
                concurrency: 2,
                delayBetweenBatchesMs: 350,
                dryRun: false,
            });
        });

        return {
            success: true,
            symbolsProcessed: summary.symbolsProcessed.length,
            totalArticlesRetrieved: summary.totalArticlesRetrieved,
            newArticlesSaved: summary.newArticlesSaved,
            duplicateArticlesSkipped: summary.duplicateArticlesSkipped,
            failedProviderRequests: summary.failedProviderRequests,
            sentimentProcessingFailures: summary.sentimentProcessingFailures,
            duration: `${summary.startedAt} to ${summary.completedAt}`,
            errors: summary.errors,
        };
    }
);
