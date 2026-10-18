import { inngest } from "@/lib/inngest/client";
import {
    NEWS_SUMMARY_EMAIL_PROMPT,
    PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import {
    sendNewsSummaryEmail,
    sendPersonalizedWatchlistNewsEmail,
    sendWelcomeEmail,
} from "@/lib/nodemailer";
import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistStockItemsByEmail } from "@/lib/actions/watchlist.actions";
import { WatchlistNewsService, WatchlistNewsResult } from "@/services/news/WatchlistNewsService";
import { WatchlistNewsSummarizer } from "@/services/news/WatchlistNewsSummarizer";
import { getFormattedTodayDate } from "@/lib/utils";

/* =====================================================
   Welcome email on signup
===================================================== */
export const sendSignUpEmail = inngest.createFunction(
    { id: "sign-up-email" },
    { event: "app/user.created" },
    async ({ event, step }) => {
        const userProfile = `
- Country: ${event.data.country}
- Investment goals: ${event.data.investmentGoals}
- Risk tolerance: ${event.data.riskTolerance}
- Preferred industry: ${event.data.preferredIndustry}
`;

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace(
            "{{userProfile}}",
            userProfile
        );

        const response = await step.ai.infer("generate-welcome-intro", {
            model: step.ai.models.gemini({ model: "gemini-2.5-flash-lite" }),
            body: {
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
            },
        });

        await step.run("send-welcome-email", async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText =
                (part && "text" in part ? part.text : null) ||
                "Thanks for joining HyperStocks. You now have the tools to track markets and make smarter moves.";

            const {
                data: { email, name },
            } = event;

            return await sendWelcomeEmail({
                email,
                name,
                intro: introText,
            });
        });

        return {
            success: true,
            message: "Welcome email sent successfully",
        };
    }
);

/* =====================================================
   Daily watchlist-based news summary
===================================================== */
export const sendDailyNewsSummary = inngest.createFunction(
    { id: "daily-news-summary" },
    [{ event: "app/send.daily.news" }, { cron: "0 12 * * *" }],
    async ({ step }) => {
        // 1️⃣ Get users who are subscribed to daily news
        const users = await step.run(
            "get-all-users",
            getAllUsersForNewsEmail
        );

        if (!users || users.length === 0) {
            return {
                success: false,
                message: "No eligible users found for daily news email",
            };
        }

        const todayDate = getFormattedTodayDate();

        // 2️⃣ Fetch personalized watchlist news per user
        const userNewsResults = await step.run("fetch-personalized-news", async () => {
            const watchlistService = new WatchlistNewsService();
            const results: Array<{
                user: { id: string; email: string; name: string };
                result: WatchlistNewsResult;
            }> = [];

            for (const user of users) {
                try {
                    const watchlistItems = await getWatchlistStockItemsByEmail(user.email);
                    const newsResult = await watchlistService.getPersonalizedWatchlistNews(
                        watchlistItems,
                        4, // 4 days lookback
                        6  // max 6 high-relevance articles
                    );
                    results.push({ user, result: newsResult });
                } catch (e: any) {
                    console.error("daily-news: error preparing watchlist news for", user.email, e);
                    results.push({
                        user,
                        result: {
                            status: 'api_error',
                            articles: [],
                            allTrackedSymbols: [],
                            allTrackedCompanies: {},
                            symbolsWithNews: [],
                            symbolsWithoutNews: [],
                            error: e?.message || 'Failed to fetch watchlist news',
                        },
                    });
                }
            }

            return results;
        });

        // 3️⃣ Summarize articles using Gemini + Cache + Fallback
        const summarizedResults = await step.run("summarize-articles", async () => {
            const finalized: Array<{
                user: { id: string; email: string; name: string };
                result: WatchlistNewsResult;
            }> = [];

            for (const item of userNewsResults) {
                if (item.result.articles.length > 0) {
                    const summarizedArticles = await WatchlistNewsSummarizer.summarizeBatch(
                        item.result.articles
                    );
                    finalized.push({
                        user: item.user,
                        result: {
                            ...item.result,
                            articles: summarizedArticles,
                        },
                    });
                } else {
                    finalized.push(item);
                }
            }

            return finalized;
        });

        // 4️⃣ Send personalized emails (isolated per recipient)
        const sendResults = await step.run("send-personalized-emails", async () => {
            const sentLogs: Array<{ email: string; status: string; articleCount: number }> = [];

            for (const { user, result } of summarizedResults) {
                try {
                    await sendPersonalizedWatchlistNewsEmail({
                        email: user.email,
                        name: user.name,
                        date: todayDate,
                        result,
                    });
                    sentLogs.push({
                        email: user.email,
                        status: 'sent',
                        articleCount: result.articles.length,
                    });
                } catch (err: any) {
                    console.error(`Failed to send watchlist news email to ${user.email}:`, err);
                    sentLogs.push({
                        email: user.email,
                        status: `failed: ${err?.message || 'Unknown error'}`,
                        articleCount: result.articles.length,
                    });
                }
            }

            return sentLogs;
        });

        return {
            success: true,
            message: `Personalized watchlist news emails processed for ${sendResults.length} users`,
            sentLogs: sendResults,
        };
    }
);
