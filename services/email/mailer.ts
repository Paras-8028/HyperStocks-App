import nodemailer, { Transporter } from 'nodemailer';

let transporterInstance: Transporter | null = null;

export function getMailTransporter(): Transporter | null {
    if (typeof window !== 'undefined') {
        throw new Error('Security violation: Nodemailer transporter cannot run in client-side code.');
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || (host === 'smtp.gmail.com' ? 465 : 587);
    const user =
        process.env.NODEMAILER_EMAIL ||
        process.env.EMAIL_USER ||
        process.env.SMTP_USER ||
        'agent8028agent@gmail.com';
    const pass =
        process.env.NODEMAILER_PASSWORD ||
        process.env.EMAIL_PASS ||
        process.env.SMTP_PASSWORD;

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
        process.env.NODEMAILER_EMAIL ||
        process.env.EMAIL_USER ||
        process.env.SMTP_USER ||
        process.env.SMTP_FROM_EMAIL ||
        'agent8028agent@gmail.com';

    const fromName =
        process.env.SMTP_FROM_NAME ||
        'HyperStocks News';

    return `"${fromName}" <${fromEmail}>`;
}
