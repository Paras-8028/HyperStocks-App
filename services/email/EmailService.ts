import { AlertEmailData, DailyDigestEmailData, EmailSendResult } from '@/types/email';
import { getMailTransporter, getSenderEmail } from './mailer';
import { buildAlertEmailHtml, generateAlertSubject } from './templates/alertEmailTemplate';
import { buildDailyDigestEmailHtml } from './templates/dailyDigestTemplate';

export interface IEmailService {
    sendAlertEmail(data: AlertEmailData): Promise<EmailSendResult>;
    sendPriceAlertEmail(data: AlertEmailData): Promise<EmailSendResult>;
    sendMovementAlertEmail(data: AlertEmailData): Promise<EmailSendResult>;
    sendNewsAlertEmail(data: AlertEmailData): Promise<EmailSendResult>;
    sendEarningsAlertEmail(data: AlertEmailData): Promise<EmailSendResult>;
    sendPortfolioAlertEmail(data: AlertEmailData): Promise<EmailSendResult>;
    sendAIInsightEmail(data: AlertEmailData): Promise<EmailSendResult>;
    sendDailyDigestEmail(data: DailyDigestEmailData): Promise<EmailSendResult>;
}

export class EmailService implements IEmailService {
    /**
     * Sends an instant personalized financial alert email via Nodemailer / SMTP
     */
    async sendAlertEmail(data: AlertEmailData): Promise<EmailSendResult> {
        try {
            if (!data.userEmail || !data.userEmail.includes('@')) {
                console.warn(`[EmailService] Invalid recipient email: "${data.userEmail}". Transmission skipped.`);
                return { success: false, error: 'Invalid recipient email address' };
            }

            const transporter = getMailTransporter();
            if (!transporter) {
                console.warn('[EmailService] SMTP credentials (SMTP_USER/SMTP_PASSWORD or NODEMAILER_EMAIL/NODEMAILER_PASSWORD) not configured. Simulation completed.');
                return {
                    success: true,
                    skipped: true,
                    reason: 'SMTP credentials not configured in environment',
                };
            }

            const subject = generateAlertSubject(data);
            const html = buildAlertEmailHtml(data);
            const from = getSenderEmail();

            const info = await transporter.sendMail({
                from,
                to: data.userEmail,
                subject,
                html,
                text: `${data.ticker} Market Alert: ${data.whyItMatters}. View details on HyperStocks: ${data.hyperstocksUrl}`,
            });

            return {
                success: true,
                id: info.messageId,
            };
        } catch (err: any) {
            console.error('[EmailService] Nodemailer error transmitting alert email:', err);
            return {
                success: false,
                error: err?.message || 'Unexpected failure during SMTP transmission',
            };
        }
    }

    /**
     * Specialized convenience helpers for each alert category
     */
    async sendPriceAlertEmail(data: AlertEmailData): Promise<EmailSendResult> {
        return this.sendAlertEmail({ ...data, alertType: 'price' });
    }

    async sendMovementAlertEmail(data: AlertEmailData): Promise<EmailSendResult> {
        return this.sendAlertEmail({ ...data, alertType: 'percentage_movement' });
    }

    async sendNewsAlertEmail(data: AlertEmailData): Promise<EmailSendResult> {
        return this.sendAlertEmail({ ...data, alertType: 'news' });
    }

    async sendEarningsAlertEmail(data: AlertEmailData): Promise<EmailSendResult> {
        return this.sendAlertEmail({ ...data, alertType: 'earnings' });
    }

    async sendPortfolioAlertEmail(data: AlertEmailData): Promise<EmailSendResult> {
        return this.sendAlertEmail({ ...data, alertType: 'portfolio_risk' });
    }

    async sendAIInsightEmail(data: AlertEmailData): Promise<EmailSendResult> {
        return this.sendAlertEmail({ ...data, alertType: 'ai_insight' });
    }

    /**
     * Sends a personalized daily market intelligence briefing via Nodemailer / SMTP
     */
    async sendDailyDigestEmail(data: DailyDigestEmailData): Promise<EmailSendResult> {
        try {
            if (!data.userEmail || !data.userEmail.includes('@')) {
                console.warn(`[EmailService] Invalid recipient email for daily digest: "${data.userEmail}".`);
                return { success: false, error: 'Invalid recipient email address' };
            }

            const transporter = getMailTransporter();
            if (!transporter) {
                console.warn('[EmailService] SMTP credentials not configured. Daily digest transmission simulation completed.');
                return {
                    success: true,
                    skipped: true,
                    reason: 'SMTP credentials not configured in environment',
                };
            }

            const subject = `☀️ Your HyperStocks Daily Intelligence • ${data.date}`;
            const html = buildDailyDigestEmailHtml(data);
            const from = getSenderEmail();

            const info = await transporter.sendMail({
                from,
                to: data.userEmail,
                subject,
                html,
                text: `Good morning ${data.userName}. Your HyperStocks Daily Market Intelligence is ready. View full dashboard at: ${data.hyperstocksUrl}`,
            });

            return {
                success: true,
                id: info.messageId,
            };
        } catch (err: any) {
            console.error('[EmailService] Nodemailer error transmitting daily digest:', err);
            return {
                success: false,
                error: err?.message || 'Unexpected failure during daily digest SMTP transmission',
            };
        }
    }
}

// Singleton provider
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
    if (!emailServiceInstance) {
        emailServiceInstance = new EmailService();
    }
    return emailServiceInstance;
}
