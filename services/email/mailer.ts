import nodemailer, { Transporter } from 'nodemailer';

let transporterInstance: Transporter | null = null;

export function getMailTransporter(): Transporter | null {
    if (typeof window !== 'undefined') {
        throw new Error('Security violation: Nodemailer transporter cannot run in client-side code.');
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || (host === 'smtp.gmail.com' ? 465 : 587);
    const user = process.env.SMTP_USER || process.env.NODEMAILER_EMAIL;
    const pass = process.env.SMTP_PASSWORD || process.env.NODEMAILER_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    if (!transporterInstance) {
        const isSecure = port === 465;

        transporterInstance = nodemailer.createTransport({
            host,
            port,
            secure: isSecure,
            auth: {
                user,
                pass,
            },
            tls: {
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            },
        });
    }

    return transporterInstance;
}

export function getSenderEmail(): string {
    const fromEmail =
        process.env.SMTP_FROM_EMAIL ||
        process.env.SMTP_USER ||
        process.env.NODEMAILER_EMAIL ||
        'alerts@hyperstocks.app';

    const fromName =
        process.env.SMTP_FROM_NAME ||
        'HyperStocks Intelligence';

    return `"${fromName}" <${fromEmail}>`;
}
