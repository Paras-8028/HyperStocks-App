import { inngest } from "@/lib/inngest/client";
import {
    NEWS_SUMMARY_EMAIL_PROMPT,
    PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import {
    sendNewsSummaryEmail,
    sendWelcomeEmail,
} from "@/lib/nodemailer";
import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
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
        // 1️⃣ Get users
        const users = await step.run(
            "get-all-users",
            getAllUsersForNewsEmail
        );

        if (!users || users.length === 0) {
            return {
                success: false,
                message: "No users found for news email",
            };
        }

        // 2️⃣ Fetch news per user
        const results = await step.run("fetch-user-news", async () => {
            const perUser = [];

            for (const user of users) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(
                        user.email
                    );

                    let articles = await getNews(symbols);
                    articles = (articles || []).slice(0, 6);

                    if (!articles || articles.length === 0) {
                        articles = (await getNews()).slice(0, 6);
                    }

                    perUser.push({ user, articles });
                } catch (e) {
                    console.error(
                        "daily-news: error preparing user news",
                        user.email,
                        e
                    );
                    perUser.push({ user, articles: [] });
                }
            }

            return perUser;
        });

        // 3️⃣ AI summary
        const userNewsSummaries = [];

        for (const { user, articles } of results) {
            try {
                const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
                    "{{newsData}}",
                    JSON.stringify(articles, null, 2)
                );

                const response = await step.ai.infer(
                    `summarize-news-${user.email}`,
                    {
                        model: step.ai.models.gemini({
                            model: "gemini-2.5-flash-lite",
                        }),
                        body: {
                            contents: [
                                {
                                    role: "user",
                                    parts: [{ text: prompt }],
                                },
                            ],
                        },
                    }
                );

                const part =
                    response.candidates?.[0]?.content?.parts?.[0];
                const newsContent =
                    (part && "text" in part ? part.text : null) ||
                    "No market news.";

                userNewsSummaries.push({ user, newsContent });
            } catch (e) {
                console.error(
                    "Failed to summarize news for:",
                    user.email
                );
                userNewsSummaries.push({ user, newsContent: null });
            }
        }

        // 4️⃣ Send emails
        await step.run("send-news-emails", async () => {
            await Promise.all(
                userNewsSummaries.map(({ user, newsContent }) => {
                    if (!newsContent) return false;

                    return sendNewsSummaryEmail({
                        email: user.email,
                        date: getFormattedTodayDate(),
                        newsContent,
                    });
                })
            );
        });

        return {
            success: true,
            message: "Daily news summary emails sent successfully",
        };
    }
);
