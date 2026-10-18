import nodemailer from "nodemailer";
import {
    WELCOME_EMAIL_TEMPLATE,
    NEWS_SUMMARY_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";

/* --------------------------------------------------
   Transporter
-------------------------------------------------- */

export const getFromAddress = (defaultName = "HyperStocks News") => {
    const senderEmail =
        process.env.NODEMAILER_EMAIL ||
        process.env.EMAIL_USER ||
        process.env.SMTP_USER ||
        process.env.SMTP_FROM_EMAIL ||
        "agent8028agent@gmail.com";
    const senderName = process.env.SMTP_FROM_NAME || defaultName;
    return `"${senderName}" <${senderEmail}>`;
};

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user:
            process.env.NODEMAILER_EMAIL ||
            process.env.EMAIL_USER ||
            process.env.SMTP_USER ||
            "agent8028agent@gmail.com",
        pass:
            process.env.NODEMAILER_PASSWORD ||
            process.env.EMAIL_PASS ||
            process.env.SMTP_PASSWORD ||
            "",
    },
});

/* --------------------------------------------------
   Welcome Email
-------------------------------------------------- */

export const sendWelcomeEmail = async ({
                                           email,
                                           name,
                                           intro,
                                       }: WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replace("{{name}}", name)
        .replace("{{intro}}", intro);

    await transporter.sendMail({
        from: getFromAddress("HyperStocks"),
        to: email,
        subject: "Welcome to HyperStocks - your stock market toolkit is ready!",
        text: "Thanks for joining HyperStocks",
        html: htmlTemplate,
    });
};

/* --------------------------------------------------
   News Summary Email
-------------------------------------------------- */

export { renderWatchlistNewsEmail } from "@/services/email/templates/watchlistNewsEmailTemplate";
import { renderWatchlistNewsEmail } from "@/services/email/templates/watchlistNewsEmailTemplate";
import { WatchlistNewsResult } from "@/services/news/WatchlistNewsService";

export const sendPersonalizedWatchlistNewsEmail = async ({
    email,
    name,
    date,
    result,
}: {
    email: string;
    name?: string;
    date: string;
    result: WatchlistNewsResult;
}) => {
    const { subject, html, text } = renderWatchlistNewsEmail({
        recipientEmail: email,
        recipientName: name,
        dateStr: date,
        result,
    });

    return await transporter.sendMail({
        from: getFromAddress("HyperStocks News"),
        to: email,
        subject,
        text,
        html,
    });
};

export const sendNewsSummaryEmail = async ({
                                               email,
                                               date,
                                               newsContent,
                                           }: {
    email: string;
    date: string;
    newsContent: string;
}) => {
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace("{{date}}", date)
        .replace("{{newsContent}}", newsContent);

    await transporter.sendMail({
        from: getFromAddress("HyperStocks News"),
        to: email,
        subject: `📈 Market News Summary - ${date}`,
        text: "Today's market news summary from HyperStocks",
        html: htmlTemplate,
    });
};

/* --------------------------------------------------
   Price Alert Email ✅ NEW
-------------------------------------------------- */

export const sendAlertEmail = async ({
                                         email,
                                         symbol,
                                         price,
                                         target,
                                         condition,
                                     }: {
    email: string;
    symbol: string;
    price: number;
    target: number;
    condition: "above" | "below";
}) => {
    const subject = `🚨 Price Alert: ${symbol}`;

    const html = `
        <h2>🚨 Price Alert Triggered</h2>
        <p><strong>Stock:</strong> ${symbol}</p>
        <p><strong>Current Price:</strong> $${price}</p>
        <p><strong>Target Price:</strong> $${target}</p>
        <p><strong>Condition:</strong> ${condition.toUpperCase()}</p>
        <br />
        <p>This alert has been triggered and disabled automatically.</p>
    `;

    await transporter.sendMail({
        from: getFromAddress("HyperStocks Alerts"),
        to: email,
        subject,
        text: `Price alert triggered for ${symbol}`,
        html,
    });
};
