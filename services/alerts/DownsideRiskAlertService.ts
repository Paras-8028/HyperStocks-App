import { connectToDatabase } from '@/database/mongoose';
import { UserPreferenceModel } from '@/database/models/user_preference.model';
import { AlertPreferenceModel } from '@/database/models/alert_preference.model';
import { AlertDeliveryLogModel } from '@/database/models/alert_delivery_log.model';
import { getMarketService } from '@/services/market';
import { getEmailService } from '@/services/email';
import { getWatchlistStockItemsByUserId } from '@/lib/actions/watchlist.actions';
import { DownsideRiskEngine } from '@/services/risk/DownsideRiskEngine';
import { DownsideRiskAssessment, RiskSeverity, TriggeredRiskCondition } from '@/types/risk';
import { AlertNotificationPreferences, DEFAULT_ALERT_PREFERENCES, SmartAlertSeverity } from '@/types/alerts';
import { AlertEmailData } from '@/types/email';
import { StockCandlesResult, StockQuote } from '@/types/market';

export interface DownsideRiskMonitoringResult {
    evaluatedUsersCount: number;
    evaluatedSymbolsCount: number;
    triggeredAlertsCount: number;
    sentEmailsCount: number;
    skippedCooldownCount: number;
    skippedPreferenceCount: number;
    errors: string[];
}

export class DownsideRiskAlertService {
    public static readonly DEFAULT_COOLDOWN_HOURS = 24;

    /**
     * Rank order of severities for threshold and escalation comparisons.
     */
    public static severityRank(severity?: RiskSeverity | SmartAlertSeverity): number {
        switch (severity) {
            case 'critical':
                return 4;
            case 'warning':
                return 3;
            case 'advisory':
                return 2;
            case 'info':
            case 'low':
            default:
                return 1;
        }
    }

    /**
     * Filters triggered risk conditions against user preferences (alerts enabled, category toggles, min severity).
     */
    public static evaluateConditionsForUser(
        assessment: DownsideRiskAssessment,
        prefs: AlertNotificationPreferences
    ): TriggeredRiskCondition[] {
        if (!prefs || prefs.downsideRiskAlertsEnabled === false) {
            return [];
        }

        const triggered = assessment.triggeredConditions || [];
        if (triggered.length === 0) return [];

        // Filter by category toggles
        const categoryAllowed = triggered.filter((c) => {
            if (!prefs.downsideRiskCategories) return true;
            return prefs.downsideRiskCategories[c.category] !== false;
        });

        if (categoryAllowed.length === 0) return [];

        // Filter by min severity
        const minAllowedSeverity = prefs.downsideRiskMinSeverity || 'warning';
        const minRank = this.severityRank(minAllowedSeverity);

        return categoryAllowed.filter((c) => this.severityRank(c.severity) >= minRank);
    }

    /**
     * Evaluates whether an alert condition is a duplicate within cooldown window,
     * or represents a meaningful severity escalation.
     */
    public static isDuplicateAlert(
        condition: TriggeredRiskCondition,
        existingLog: { sentAt?: Date; cooldownUntil?: Date; deliveryStatus?: string; severity?: string } | null,
        cooldownHours: number = 24
    ): boolean {
        if (!existingLog) return false;

        // Check if under cooldown window
        const now = Date.now();
        let isUnderCooldown = false;

        if (existingLog.cooldownUntil) {
            isUnderCooldown = new Date(existingLog.cooldownUntil).getTime() > now;
        } else if (existingLog.sentAt) {
            const elapsedHours = (now - new Date(existingLog.sentAt).getTime()) / (1000 * 3600);
            isUnderCooldown = elapsedHours < cooldownHours;
        }

        if (!isUnderCooldown) {
            return false;
        }

        // Check escalation: if new severity rank > previous severity rank, allow alert through
        const prevRank = this.severityRank((existingLog.severity as RiskSeverity) || 'warning');
        const currentRank = this.severityRank(condition.severity);

        return currentRank <= prevRank;
    }

    /**
     * Checks if the current time falls within user-configured quiet hours.
     */
    public static isQuietHoursActive(quietHours?: { enabled: boolean; start: string; end: string }): boolean {
        if (!quietHours || !quietHours.enabled || !quietHours.start || !quietHours.end) {
            return false;
        }

        try {
            const now = new Date();
            const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const { start, end } = quietHours;

            if (start <= end) {
                return currentHourMin >= start && currentHourMin <= end;
            } else {
                // Crosses midnight, e.g. 22:00 to 07:00
                return currentHourMin >= start || currentHourMin <= end;
            }
        } catch {
            return false;
        }
    }

    /**
     * Evaluates watchlist downside risks across all subscribed users,
     * aggregating shared tickers, calculating quantitative indicators, and dispatching alerts.
     */
    public static async evaluateAndDispatchWatchlistRisk(): Promise<DownsideRiskMonitoringResult> {
        await connectToDatabase();

        const result: DownsideRiskMonitoringResult = {
            evaluatedUsersCount: 0,
            evaluatedSymbolsCount: 0,
            triggeredAlertsCount: 0,
            sentEmailsCount: 0,
            skippedCooldownCount: 0,
            skippedPreferenceCount: 0,
            errors: [],
        };

        try {
            // 1. Fetch eligible subscribed users
            const users = await UserPreferenceModel.find({
                email: { $exists: true, $ne: '' },
                isSchedulePaused: { $ne: true },
            }).lean();

            result.evaluatedUsersCount = users.length;
            if (users.length === 0) return result;

            // 2. Discover watchlist items per user and gather distinct tickers across the batch
            const userWatchlistMap = new Map<
                string,
                {
                    user: (typeof users)[0];
                    prefs: AlertNotificationPreferences;
                    items: Array<{ symbol: string; company: string }>;
                }
            >();

            const allDistinctSymbols = new Set<string>();

            for (const user of users) {
                try {
                    // Check user alert preferences
                    const prefDoc = await AlertPreferenceModel.findOne({ userId: user.userId }).lean();
                    const prefs: AlertNotificationPreferences = (prefDoc as any)?.preferences || DEFAULT_ALERT_PREFERENCES;

                    if (prefs.emailAlertsEnabled === false || prefs.downsideRiskAlertsEnabled === false) {
                        result.skippedPreferenceCount++;
                        continue;
                    }

                    if (this.isQuietHoursActive(prefs.quietHours)) {
                        result.skippedPreferenceCount++;
                        continue;
                    }

                    const watchlistItems = await getWatchlistStockItemsByUserId(user.userId);
                    if (watchlistItems.length === 0) continue;

                    userWatchlistMap.set(user.userId, {
                        user,
                        prefs,
                        items: watchlistItems,
                    });

                    watchlistItems.forEach((i) => {
                        const s = i.symbol.trim().toUpperCase();
                        if (s) allDistinctSymbols.add(s);
                    });
                } catch (userErr: any) {
                    console.warn(`[DownsideRiskAlertService] Error preparing user ${user.userId}:`, userErr);
                    result.errors.push(`User ${user.userId}: ${userErr?.message || 'Error loading watchlists'}`);
                }
            }

            result.evaluatedSymbolsCount = allDistinctSymbols.size;
            if (allDistinctSymbols.size === 0) return result;

            // 3. Batch retrieve market candles & quotes once per unique ticker (bounded concurrency)
            const marketService = getMarketService();
            const symbolDataMap = new Map<string, { quote?: StockQuote; candles?: StockCandlesResult; companyName?: string }>();

            const symbolList = Array.from(allDistinctSymbols);
            const nowSec = Math.floor(Date.now() / 1000);
            const oneYearAgoSec = nowSec - 365 * 24 * 60 * 60; // 1 year trailing candles

            const chunkSize = 4;
            for (let i = 0; i < symbolList.length; i += chunkSize) {
                const chunk = symbolList.slice(i, i + chunkSize);
                await Promise.all(
                    chunk.map(async (sym) => {
                        try {
                            const [quoteRes, candleRes] = await Promise.all([
                                marketService.getQuote(sym),
                                marketService.getCandles(sym, 'D', oneYearAgoSec, nowSec),
                            ]);

                            symbolDataMap.set(sym, {
                                quote: quoteRes.success ? quoteRes.data : undefined,
                                candles: candleRes.success ? candleRes.data : undefined,
                            });
                        } catch (symErr) {
                            console.warn(`[DownsideRiskAlertService] Failed fetching data for ${sym}:`, symErr);
                        }
                    })
                );

                if (i + chunkSize < symbolList.length) {
                    await new Promise((resolve) => setTimeout(resolve, 120));
                }
            }

            // 4. Precompute risk assessments for all symbols
            const assessmentMap = new Map<string, DownsideRiskAssessment>();
            for (const sym of symbolList) {
                const data = symbolDataMap.get(sym);
                const assessment = DownsideRiskEngine.assessDownsideRisk(
                    sym,
                    sym,
                    data?.candles,
                    data?.quote
                );
                assessmentMap.set(sym, assessment);
            }

            // 5. Evaluate and dispatch personalized alerts for each eligible user
            const emailService = getEmailService();
            const hyperstocksUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            for (const { user, prefs, items } of userWatchlistMap.values()) {
                for (const item of items) {
                    const sym = item.symbol.trim().toUpperCase();
                    const assessment = assessmentMap.get(sym);
                    if (!assessment) continue;

                    // Check conditions against user preferences
                    const allowedConditions = this.evaluateConditionsForUser(assessment, prefs);
                    if (allowedConditions.length === 0) {
                        result.skippedPreferenceCount++;
                        continue;
                    }

                    result.triggeredAlertsCount++;

                    // 6. Deduplication and meaningful escalation check
                    const primaryCondition = allowedConditions[0];
                    const alertKey = `downside_risk:${sym}:${primaryCondition.category}`;

                    const existingLog = await AlertDeliveryLogModel.findOne({
                        userId: user.userId,
                        alertKey,
                    }).lean();

                    const isDuplicate = this.isDuplicateAlert(
                        primaryCondition,
                        existingLog as any,
                        prefs.downsideRiskCooldownHours || this.DEFAULT_COOLDOWN_HOURS
                    );

                    if (isDuplicate) {
                        result.skippedCooldownCount++;
                        continue;
                    }

                    // 7. Dispatch personalized downside risk email
                    try {
                        const emailData: AlertEmailData = {
                            userName: user.name || 'Investor',
                            userEmail: user.email,
                            alertType: 'downside_risk',
                            ticker: sym,
                            companyName: item.company || sym,
                            currentPrice: assessment.currentPrice,
                            priceChange: symbolDataMap.get(sym)?.quote?.change,
                            percentageChange: symbolDataMap.get(sym)?.quote?.percentChange,
                            triggerValue: primaryCondition.measurement,
                            triggerCondition: primaryCondition.thresholdApplied,
                            riskLevel: primaryCondition.severity,
                            whyItMatters: `${sym} triggered quantitative downside conditions: ${primaryCondition.evidence}`,
                            hyperstocksUrl,
                            timestamp: Date.now(),
                            riskAssessment: assessment,
                        };

                        const sendRes = await emailService.sendAlertEmail(emailData);

                        // 8. Record delivery log with cooldown
                        const cooldownHours = prefs.downsideRiskCooldownHours || this.DEFAULT_COOLDOWN_HOURS;
                        const cooldownUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);

                        await AlertDeliveryLogModel.findOneAndUpdate(
                            { userId: user.userId, alertKey },
                            {
                                $set: {
                                    alertCategory: 'downside_risk',
                                    symbol: sym,
                                    sentAt: new Date(),
                                    cooldownUntil,
                                    deliveryStatus: sendRes.success ? 'sent' : 'failed',
                                    messageId: sendRes.id,
                                    error: sendRes.error,
                                },
                            },
                            { upsert: true }
                        );

                        if (sendRes.success) {
                            result.sentEmailsCount++;
                        } else {
                            result.errors.push(`Failed dispatch to ${user.email} for ${sym}: ${sendRes.error}`);
                        }
                    } catch (dispatchErr: any) {
                        console.error(`[DownsideRiskAlertService] Failed dispatch for user ${user.userId} on ${sym}:`, dispatchErr);
                        result.errors.push(`Send error ${sym}: ${dispatchErr?.message}`);
                    }
                }
            }
        } catch (err: any) {
            console.error('[DownsideRiskAlertService] Critical failure in evaluateAndDispatchWatchlistRisk:', err);
            result.errors.push(err?.message || 'General error processing downside risk alerts');
        }

        return result;
    }
}
