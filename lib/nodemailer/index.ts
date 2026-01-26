import nodemailer from "nodemailer";
import {
    WELCOME_EMAIL_TEMPLATE,
    NEWS_SUMMARY_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";

/* --------------------------------------------------
   Transporter
-------------------------------------------------- */

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
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
        from: `"HyperStocks" <${process.env.NODEMAILER_EMAIL}>`,
        to: email,
        subject: "Welcome to HyperStocks - your stock market toolkit is ready!",
        text: "Thanks for joining HyperStocks",
        html: htmlTemplate,
    });
};

/* --------------------------------------------------
   News Summary Email
-------------------------------------------------- */

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
        from: `"HyperStocks News" <${process.env.NODEMAILER_EMAIL}>`,
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
        from: `"HyperStocks Alerts" <${process.env.NODEMAILER_EMAIL}>`,
        to: email,
        subject,
        text: `Price alert triggered for ${symbol}`,
        html,
    });
};
