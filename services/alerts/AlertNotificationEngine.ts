import { connectToDatabase } from '@/database/mongoose';
import { AlertModel } from '@/database/models/alert.model';
import { AlertDeliveryLogModel } from '@/database/models/alert_delivery_log.model';
import { AlertPreferenceModel } from '@/database/models/alert_preference.model';
import { getMarketService } from '@/services/market';
import { getEmailService } from '@/services/email';
import { AlertContextCollector } from './AlertContextCollector';
import { AlertAIInterpreter } from './AlertAIInterpreter';
import { SmartAlertCategory, DEFAULT_ALERT_PREFERENCES, AlertNotificationPreferences } from '@/types/alerts';
import { AlertEmailData } from '@/types/email';

export interface AlertNotificationResult {
    evaluatedCount: number;
    triggeredCount: number;
    emailsSentCount: number;
    emailsSkippedCount: number;
    errors: string[];
}

export class AlertNotificationEngine {
    private static DEFAULT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour default cooldown

    /**
     * Checks if an email alert is within an active cooldown period.
     */
    public static async isUnderCooldown(userId: string, alertKey: string): Promise<boolean> {
        try {
            await connectToDatabase();
            const log = await AlertDeliveryLogModel.findOne({
                userId,
                alertKey,
                cooldownUntil: { $gt: new Date() },
                deliveryStatus: 'sent',
            }).lean();

            return !!log;
        } catch (err) {
            console.warn('[AlertNotificationEngine] Cooldown lookup error:', err);
            return false;
        }
    }

    /**
     * Records an email dispatch result in the persistent delivery log for deduplication.
     */
    public static async recordDeliveryLog(
        userId: string,
        alertKey: string,
        alertCategory: SmartAlertCategory,
        symbol: string,
        deliveryStatus: 'sent' | 'failed',
        messageId?: string,
        error?: string,
        cooldownMs: number = this.DEFAULT_COOLDOWN_MS
    ): Promise<void> {
        try {
            await connectToDatabase();
            const now = new Date();
            const cooldownUntil = new Date(now.getTime() + cooldownMs);

            await AlertDeliveryLogModel.findOneAndUpdate(
                { userId, alertKey },
                {
                    $set: {
                        alertCategory,
                        symbol,
                        sentAt: now,
                        cooldownUntil,
                        deliveryStatus,
                        messageId,
                        error,
                    },
                },
                { upsert: true }
            );
        } catch (err) {
            console.warn('[AlertNotificationEngine] Error recording delivery log:', err);
        }
    }

    /**
     * Processes all active legacy and smart price alerts across users.
     * Evaluates current market price, checks triggers, cooldown, user preferences, and sends Nodemailer emails.
     */
    public static async processActivePriceAlerts(): Promise<AlertNotificationResult> {
        await connectToDatabase();

        const result: AlertNotificationResult = {
            evaluatedCount: 0,
            triggeredCount: 0,
            emailsSentCount: 0,
            emailsSkippedCount: 0,
            errors: [],
        };

        try {
            // Find active alerts
            const activeAlerts = await AlertModel.find({ status: 'active' });
            result.evaluatedCount = activeAlerts.length;

            if (activeAlerts.length === 0) {
                return result;
            }

            const marketService = getMarketService();

            for (const alert of activeAlerts) {
                try {
                    const symbol = alert.symbol.toUpperCase();
                    const quoteRes = await marketService.getQuote(symbol);

                    if (!quoteRes.success || !quoteRes.data) {
                        continue;
                    }

                    const currentPrice = quoteRes.data.currentPrice;
                    const previousClose = quoteRes.data.previousClose || currentPrice - quoteRes.data.change;

                    const isTriggered =
                        alert.condition === 'above'
                            ? currentPrice >= alert.targetPrice
                            : currentPrice <= alert.targetPrice;

                    if (!isTriggered) {
                        // Reset lastTriggeredCondition if price reversed back across threshold
                        if (alert.lastTriggeredPrice) {
                            const hasReversed =
                                alert.condition === 'above'
                                    ? currentPrice < alert.targetPrice
                                    : currentPrice > alert.targetPrice;

                            if (hasReversed) {
                                alert.lastTriggeredPrice = undefined;
                                await alert.save();
                            }
                        }
                        continue;
                    }

                    result.triggeredCount++;

                    // Check deduplication / price hover state
                    if (alert.lastTriggeredPrice) {
                        // Already triggered and still hovering on the same side of threshold
                        result.emailsSkippedCount++;
                        continue;
                    }

                    // Check cooldown
                    const alertKey = `price:${symbol}:${alert.condition}:${alert.targetPrice}`;
                    const underCooldown = await this.isUnderCooldown(alert.userId, alertKey);

                    if (underCooldown) {
                        result.emailsSkippedCount++;
                        continue;
                    }

                    // Check User Preferences
                    const prefDoc = await AlertPreferenceModel.findOne({ userId: alert.userId }).lean();
                    const prefs: AlertNotificationPreferences = (prefDoc as any)?.preferences || DEFAULT_ALERT_PREFERENCES;

                    if (prefs.emailAlertsEnabled === false) {
                        result.emailsSkippedCount++;
                        continue;
                    }

                    if (prefs.emailCategories && prefs.emailCategories.price === false) {
                        result.emailsSkippedCount++;
                        continue;
                    }

                    // Collect full context (Clerk identity, portfolio, watchlist, news, benchmarks)
                    const context = await AlertContextCollector.collectContext(alert.userId, symbol);

                    if (!context.userEmail) {
                        console.warn(`[AlertNotificationEngine] No email resolved for user ${alert.userId}. Skipping.`);
                        result.emailsSkippedCount++;
                        continue;
                    }

                    // Generate AI interpretation without hallucinating numbers
                    const aiInterpretation = await AlertAIInterpreter.interpretAlert(context, 'price', {
                        condition: alert.condition,
                        targetPrice: alert.targetPrice,
                        percentChange: quoteRes.data.percentChange,
                    });

                    // Build email payload
                    const emailData: AlertEmailData = {
                        userName: context.userName,
                        userEmail: context.userEmail,
                        alertType: 'price',
                        ticker: symbol,
                        companyName: context.companyProfile?.name,
                        currentPrice,
                        previousPrice: previousClose,
                        priceChange: quoteRes.data.change,
                        percentageChange: quoteRes.data.percentChange,
                        triggerValue: alert.targetPrice,
                        triggerCondition: alert.condition,
                        volume: quoteRes.data.volume,
                        averageVolume: quoteRes.data.volume,
                        marketContext: context.marketContext,
                        relevantNews: context.relevantNews,
                        portfolioContext: context.portfolioContext,
                        aiSummary: aiInterpretation.aiSummary,
                        aiAnalysis: aiInterpretation.aiAnalysis,
                        riskLevel: aiInterpretation.riskLevel,
                        whyItMatters: aiInterpretation.whyItMatters,
                        hyperstocksUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
                        timestamp: Date.now(),
                    };

                    // Send email via Nodemailer
                    const emailService = getEmailService();
                    const sendResult = await emailService.sendAlertEmail(emailData);

                    // Update Alert record & delivery log
                    alert.lastTriggeredPrice = currentPrice;
                    alert.triggeredAt = new Date();
                    alert.emailSent = sendResult.success;
                    alert.lastEmailSentAt = new Date();
                    alert.emailDeliveryStatus = sendResult.success ? 'sent' : 'failed';
                    alert.emailError = sendResult.error;
                    alert.cooldownUntil = new Date(Date.now() + this.DEFAULT_COOLDOWN_MS);

                    await alert.save();

                    await this.recordDeliveryLog(
                        alert.userId,
                        alertKey,
                        'price',
                        symbol,
                        sendResult.success ? 'sent' : 'failed',
                        sendResult.id,
                        sendResult.error
                    );

                    if (sendResult.success) {
                        result.emailsSentCount++;
                    } else {
                        result.errors.push(`Failed to send price alert email to ${context.userEmail}: ${sendResult.error}`);
                    }
                } catch (singleAlertErr: any) {
                    console.error('[AlertNotificationEngine] Error evaluating single alert:', singleAlertErr);
                    result.errors.push(singleAlertErr?.message || 'Error processing individual alert');
                }
            }
        } catch (err: any) {
            console.error('[AlertNotificationEngine] Critical failure in processActivePriceAlerts:', err);
            result.errors.push(err?.message || 'General error processing price alerts');
        }

        return result;
    }

    /**
     * Evaluates smart market events (significant moves, volume spikes, portfolio risk) for a specific user
     * and dispatches email alerts if preferences and cooldown allow.
     */
    public static async dispatchSmartAlertNotification(
        userId: string,
        symbol: string,
        alertType: SmartAlertCategory,
        details: {
            title: string;
            event: string;
            triggerValue?: number | string;
            percentageChange?: number;
            volumeRatio?: number;
            detectedSignal?: string;
        }
    ): Promise<boolean> {
        try {
            await connectToDatabase();
            const cleanSymbol = symbol.trim().toUpperCase();
            const alertKey = `${alertType}:${cleanSymbol}`;

            // Check cooldown & deduplication
            const underCooldown = await this.isUnderCooldown(userId, alertKey);
            if (underCooldown) {
                return false;
            }

            // Check User Preferences
            const prefDoc = await AlertPreferenceModel.findOne({ userId }).lean();
            const prefs: AlertNotificationPreferences = (prefDoc as any)?.preferences || DEFAULT_ALERT_PREFERENCES;

            if (prefs.emailAlertsEnabled === false) {
                return false;
            }

            if (prefs.emailCategories && prefs.emailCategories[alertType] === false) {
                return false;
            }

            // If user prefers important_only, check severity
            if (prefs.emailFrequency === 'important_only') {
                const isSignificant =
                    alertType === 'portfolio_risk' ||
                    (details.percentageChange && Math.abs(details.percentageChange) >= 4.0);
                if (!isSignificant) {
                    return false;
                }
            }

            // Collect context
            const context = await AlertContextCollector.collectContext(userId, cleanSymbol);
            if (!context.userEmail) {
                return false;
            }

            // AI interpretation
            const aiInterpretation = await AlertAIInterpreter.interpretAlert(context, alertType, {
                percentChange: details.percentageChange ?? context.quote?.percentChange,
                volumeRatio: details.volumeRatio,
                detectedSignal: details.detectedSignal,
            });

            // Build email
            const emailData: AlertEmailData = {
                userName: context.userName,
                userEmail: context.userEmail,
                alertType,
                ticker: cleanSymbol,
                companyName: context.companyProfile?.name,
                currentPrice: context.quote?.currentPrice || 0,
                previousPrice: context.quote?.previousClose,
                priceChange: context.quote?.change,
                percentageChange: details.percentageChange ?? context.quote?.percentChange,
                triggerValue: details.triggerValue,
                volume: context.quote?.volume,
                averageVolume: context.quote?.volume,
                marketContext: context.marketContext,
                relevantNews: context.relevantNews,
                portfolioContext: context.portfolioContext,
                aiSummary: aiInterpretation.aiSummary,
                aiAnalysis: aiInterpretation.aiAnalysis,
                riskLevel: aiInterpretation.riskLevel,
                whyItMatters: aiInterpretation.whyItMatters,
                hyperstocksUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
                timestamp: Date.now(),
                detectedSignal: details.detectedSignal,
            };

            const emailService = getEmailService();
            const sendRes = await emailService.sendAlertEmail(emailData);

            // Record log
            await this.recordDeliveryLog(
                userId,
                alertKey,
                alertType,
                cleanSymbol,
                sendRes.success ? 'sent' : 'failed',
                sendRes.id,
                sendRes.error
            );

            return sendRes.success;
        } catch (err) {
            console.error('[AlertNotificationEngine] Error dispatching smart alert:', err);
            return false;
        }
    }
}
