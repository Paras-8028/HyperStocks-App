import { inngest } from "@/lib/inngest/client";
import {
    PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import {
    sendPersonalizedWatchlistNewsEmail,
    sendWelcomeEmail,
} from "@/lib/nodemailer";
import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistStockItemsByUserId } from "@/lib/actions/watchlist.actions";
import { WatchlistNewsService, WatchlistNewsResult } from "@/services/news/WatchlistNewsService";
import { WatchlistNewsSummarizer } from "@/services/news/WatchlistNewsSummarizer";
import { getFormattedTodayDate } from "@/lib/utils";
import { isDeliveryDue } from "@/lib/utils/scheduling";
import { connectToDatabase } from "@/database/mongoose";
import { DigestDeliveryLogModel } from "@/database/models/digest_delivery_log.model";
import { UserPreferenceModel } from "@/database/models/user_preference.model";

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
   Personalized Stock News Dispatcher (Hourly Schedule + Event)
   Single source of truth for recurring scheduled news digests
===================================================== */
export const sendDailyNewsSummary = inngest.createFunction(
    { id: "daily-news-summary" },
    [{ event: "app/send.daily.news" }, { cron: "0 * * * *" }],
    async ({ step }) => {
        const executionReferenceDate = new Date();
        const todayDate = getFormattedTodayDate();

        // 1️⃣ Discover all active users from canonical UserPreferenceModel
        const allUsers = await step.run(
            "get-all-active-users",
            getAllUsersForNewsEmail
        );

        if (!allUsers || allUsers.length === 0) {
            return {
                success: true,
                message: "No registered subscribed users found",
                processedCount: 0,
            };
        }

        // 2️⃣ Filter users who are due right now based on timezone, preferred time, interval, and idempotency
        const dueUsers = await step.run("filter-due-users", async () => {
            await connectToDatabase();
            const candidates: Array<{
                userId: string;
                email: string;
                name: string;
                idempotencyKey: string;
            }> = [];

            for (const user of allUsers) {
                const eligibility = isDeliveryDue(user, executionReferenceDate);
                if (!eligibility.isDue || !eligibility.idempotencyKey) {
                    continue;
                }

                // Check delivery log: has this specific window already been successfully delivered?
                const existingSent = await DigestDeliveryLogModel.findOne({
                    userId: user.userId,
                    idempotencyKey: eligibility.idempotencyKey,
                    deliveryStatus: 'sent',
                }).lean();

                if (existingSent) {
                    console.log(`[Scheduler] Skipping already sent window for user ${user.userId} (${eligibility.idempotencyKey})`);
                    continue;
                }

                candidates.push({
                    userId: user.userId,
                    email: user.email,
                    name: user.name,
                    idempotencyKey: eligibility.idempotencyKey,
                });
            }

            return candidates;
        });

        if (dueUsers.length === 0) {
            return {
                success: true,
                message: `Hourly dispatcher evaluated ${allUsers.length} users; 0 due for delivery in this window`,
                processedCount: 0,
            };
        }

        // 3️⃣ Batch-optimized news retrieval:
        // Aggregate distinct tickers across the batch to avoid duplicate Finnhub calls
        const userNewsResults = await step.run("fetch-batch-personalized-news", async () => {
            const watchlistService = new WatchlistNewsService();
            const userWatchlists: Array<{
                user: { userId: string; email: string; name: string; idempotencyKey: string };
                items: Array<{ symbol: string; company: string }>;
            }> = [];

            const allDistinctTickers = new Set<string>();

            // Resolve watchlists per due user
            for (const user of dueUsers) {
                const items = await getWatchlistStockItemsByUserId(user.userId);
                userWatchlists.push({ user, items });
                items.forEach((item) => {
                    const sym = item.symbol.trim().toUpperCase();
                    if (sym) allDistinctTickers.add(sym);
                });
            }

            // Fetch company news once per distinct ticker with bounded concurrency
            const tickerList = Array.from(allDistinctTickers);
            const { newsMap, hadSuccessfulFetch, error } =
                await watchlistService.fetchNewsForDistinctTickers(tickerList, 4, 4);

            const batchResults: Array<{
                user: { userId: string; email: string; name: string; idempotencyKey: string };
                result: WatchlistNewsResult;
            }> = [];

            for (const { user, items } of userWatchlists) {
                if (items.length === 0) {
                    batchResults.push({
                        user,
                        result: {
                            status: 'empty_watchlist',
                            articles: [],
                            allTrackedSymbols: [],
                            allTrackedCompanies: {},
                            symbolsWithNews: [],
                            symbolsWithoutNews: [],
                        },
                    });
                    continue;
                }

                // Filter & score news specifically for this user's watchlist (guaranteed isolation)
                const userResult = watchlistService.filterAndRankNewsForWatchlist(
                    items,
                    newsMap,
                    6,
                    error
                );

                batchResults.push({ user, result: userResult });
            }

            return batchResults;
        });

        // 4️⃣ Summarize articles using Gemini + Cache + Fallback
        const summarizedResults = await step.run("summarize-articles", async () => {
            const finalized: Array<{
                user: { userId: string; email: string; name: string; idempotencyKey: string };
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

        // 5️⃣ Deliver personalized emails with idempotency logging & error isolation
        const sendResults = await step.run("deliver-personalized-emails", async () => {
            await connectToDatabase();
            const sentLogs: Array<{
                userId: string;
                email: string;
                status: 'sent' | 'skipped' | 'failed';
                articleCount: number;
                error?: string;
            }> = [];

            for (const { user, result } of summarizedResults) {
                const articleUrls = result.articles.map((a) => a.url).filter(Boolean);
                const symbols = result.allTrackedSymbols;
                const deliveryType = result.status === 'empty_watchlist' ? 'empty_watchlist' : 'personalized_news';

                // Re-verify idempotency lock right before send
                const existingLog = await DigestDeliveryLogModel.findOne({
                    userId: user.userId,
                    idempotencyKey: user.idempotencyKey,
                });

                if (existingLog && existingLog.deliveryStatus === 'sent') {
                    sentLogs.push({
                        userId: user.userId,
                        email: user.email,
                        status: 'skipped',
                        articleCount: result.articles.length,
                    });
                    continue;
                }

                // Mark delivery as pending
                await DigestDeliveryLogModel.updateOne(
                    { userId: user.userId, idempotencyKey: user.idempotencyKey },
                    {
                        $setOnInsert: {
                            userId: user.userId,
                            idempotencyKey: user.idempotencyKey,
                            createdAt: new Date(),
                        },
                        $set: {
                            deliveryType,
                            symbols,
                            articleUrls,
                            deliveryStatus: 'pending',
                            attemptedAt: new Date(),
                        },
                    },
                    { upsert: true }
                );

                try {
                    const sendRes = await sendPersonalizedWatchlistNewsEmail({
                        email: user.email,
                        name: user.name,
                        date: todayDate,
                        result,
                    });

                    const providerMessageId = (sendRes as any)?.messageId || '';

                    // Confirmed successful delivery
                    await DigestDeliveryLogModel.updateOne(
                        { userId: user.userId, idempotencyKey: user.idempotencyKey },
                        {
                            $set: {
                                deliveryStatus: 'sent',
                                sentAt: new Date(),
                                providerMessageId,
                                error: undefined,
                            },
                        }
                    );

                    // Update user's last delivery timestamp
                    await UserPreferenceModel.updateOne(
                        { userId: user.userId },
                        {
                            $set: {
                                lastNewsDeliveryAt: new Date(),
                            },
                        }
                    );

                    sentLogs.push({
                        userId: user.userId,
                        email: user.email,
                        status: 'sent',
                        articleCount: result.articles.length,
                    });
                } catch (sendErr: any) {
                    const sanitizedError = String(sendErr?.message || sendErr || 'SMTP delivery failure').slice(0, 500);
                    console.error(`[Scheduler] Failed delivering to ${user.email}:`, sanitizedError);

                    // Record failed attempt in delivery log without updating lastNewsDeliveryAt
                    await DigestDeliveryLogModel.updateOne(
                        { userId: user.userId, idempotencyKey: user.idempotencyKey },
                        {
                            $set: {
                                deliveryStatus: 'failed',
                                error: sanitizedError,
                            },
                        }
                    );

                    sentLogs.push({
                        userId: user.userId,
                        email: user.email,
                        status: 'failed',
                        articleCount: result.articles.length,
                        error: sanitizedError,
                    });
                }
            }

            return sentLogs;
        });

        return {
            success: true,
            evaluatedTotalUsers: allUsers.length,
            dueUsersCount: dueUsers.length,
            deliveries: sendResults,
        };
    }
);
