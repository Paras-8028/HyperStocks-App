import { IAlertService } from './IAlertService';
import { ApiResult } from '@/types/api';
import {
    AlertEntity,
    AlertNotificationPreferences,
    CreateAlertInput,
    DEFAULT_ALERT_PREFERENCES,
    SmartAlertCategory,
    SmartAlertItem,
    SmartAlertSeverity,
} from '@/types/alerts';
import { connectToDatabase } from '@/database/mongoose';
import { AlertModel } from '@/database/models/alert.model';
import { AlertPreferenceModel } from '@/database/models/alert_preference.model';
import { getMarketService } from '@/services/market';
import { getPortfolioService } from '@/services/portfolio';
import { getPersonalizationService } from '@/services/personalization';
import { SmartAlertGenerator } from './SmartAlertGenerator';
import { sortAlertsByPriority } from './AlertPriorityScorer';
import { StockQuote } from '@/types/market';

// In-memory fallback stores for offline/test environments
const inMemoryPrefs = new Map<string, AlertNotificationPreferences>();
const inMemoryReadAlerts = new Map<string, Set<string>>();

const SEVERITY_LEVELS: Record<SmartAlertSeverity, number> = {
    advisory: 1,
    info: 2,
    warning: 3,
    critical: 4,
};

export class AlertService implements IAlertService {
    // ==========================================
    // LEGACY PRICE TARGET ALERTS
    // ==========================================
    async getUserAlerts(userId: string): Promise<ApiResult<AlertEntity[]>> {
        try {
            await connectToDatabase();
            const docs = await AlertModel.find({ userId })
                .sort({ createdAt: -1 })
                .lean();

            const alerts: AlertEntity[] = docs.map((d: any) => ({
                id: String(d._id),
                userId: d.userId,
                symbol: d.symbol,
                condition: d.condition,
                targetPrice: d.targetPrice,
                status: d.status || 'active',
                createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
                triggeredAt: d.triggeredAt ? new Date(d.triggeredAt).toISOString() : undefined,
            }));

            return { success: true, data: alerts };
        } catch (err: any) {
            console.error('AlertService.getUserAlerts error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to fetch user alerts',
                code: 'DB_ERROR',
            };
        }
    }

    async getAlertsForSymbol(
        userId: string,
        symbol: string
    ): Promise<ApiResult<AlertEntity[]>> {
        try {
            await connectToDatabase();
            const cleanSymbol = symbol.trim().toUpperCase();
            const docs = await AlertModel.find({ userId, symbol: cleanSymbol })
                .sort({ createdAt: -1 })
                .lean();

            const alerts: AlertEntity[] = docs.map((d: any) => ({
                id: String(d._id),
                userId: d.userId,
                symbol: d.symbol,
                condition: d.condition,
                targetPrice: d.targetPrice,
                status: d.status || 'active',
                createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
                triggeredAt: d.triggeredAt ? new Date(d.triggeredAt).toISOString() : undefined,
            }));

            return { success: true, data: alerts };
        } catch (err: any) {
            console.error('AlertService.getAlertsForSymbol error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to fetch alerts for symbol',
                code: 'DB_ERROR',
            };
        }
    }

    async createAlert(
        userId: string,
        input: CreateAlertInput
    ): Promise<ApiResult<AlertEntity>> {
        try {
            await connectToDatabase();
            const cleanSymbol = input.symbol.trim().toUpperCase();

            const doc = await AlertModel.create({
                userId,
                symbol: cleanSymbol,
                condition: input.condition,
                targetPrice: input.targetPrice,
                status: 'active',
            });

            return {
                success: true,
                data: {
                    id: String(doc._id),
                    userId: doc.userId,
                    symbol: doc.symbol,
                    condition: doc.condition,
                    targetPrice: doc.targetPrice,
                    status: doc.status,
                    createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
                },
            };
        } catch (err: any) {
            console.error('AlertService.createAlert error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to create alert',
                code: 'DB_ERROR',
            };
        }
    }

    async deleteAlert(userId: string, alertId: string): Promise<ApiResult<boolean>> {
        try {
            await connectToDatabase();
            await AlertModel.deleteOne({ _id: alertId, userId });
            return { success: true, data: true };
        } catch (err: any) {
            console.error('AlertService.deleteAlert error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to delete alert',
                code: 'DB_ERROR',
            };
        }
    }

    async evaluateAlerts(
        userId: string
    ): Promise<ApiResult<Array<AlertEntity & { isTriggered: boolean }>>> {
        const alertsRes = await this.getUserAlerts(userId);
        if (!alertsRes.success) return alertsRes;

        const marketService = getMarketService();
        const evaluated = await Promise.all(
            alertsRes.data.map(async (alert) => {
                let currentPrice = 0;
                let isTriggered = false;
                let distancePercent = 0;

                try {
                    const quoteRes = await marketService.getQuote(alert.symbol);
                    if (quoteRes.success) {
                        currentPrice = quoteRes.data.currentPrice;
                        if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
                            isTriggered = true;
                        } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
                            isTriggered = true;
                        }
                        if (currentPrice > 0) {
                            distancePercent =
                                ((alert.targetPrice - currentPrice) / currentPrice) * 100;
                        }
                    }
                } catch {
                    // Ignore quote errors for individual alerts
                }

                return {
                    ...alert,
                    currentPrice,
                    distancePercent,
                    isTriggered,
                };
            })
        );

        return {
            success: true,
            data: evaluated,
        };
    }

    // ==========================================
    // SMART AI ALERTS & PREFERENCES
    // ==========================================
    async getUserAlertPreferences(userId: string): Promise<ApiResult<AlertNotificationPreferences>> {
        try {
            await connectToDatabase();
            const doc = await AlertPreferenceModel.findOne({ userId }).lean();
            if (doc && (doc as any).preferences) {
                return {
                    success: true,
                    data: { ...DEFAULT_ALERT_PREFERENCES, ...(doc as any).preferences },
                };
            }
        } catch (err) {
            console.warn('AlertService: Falling back to in-memory preferences due to db err', err);
        }

        const cached = inMemoryPrefs.get(userId) || DEFAULT_ALERT_PREFERENCES;
        return { success: true, data: cached };
    }

    async updateAlertPreferences(
        userId: string,
        preferences: Partial<AlertNotificationPreferences>
    ): Promise<ApiResult<AlertNotificationPreferences>> {
        try {
            await connectToDatabase();
            const existing = await AlertPreferenceModel.findOne({ userId });
            const currentPrefs = existing?.preferences || DEFAULT_ALERT_PREFERENCES;
            const updatedPrefs: AlertNotificationPreferences = {
                ...currentPrefs,
                ...preferences,
                enabledCategories: {
                    ...currentPrefs.enabledCategories,
                    ...(preferences.enabledCategories || {}),
                },
            };

            await AlertPreferenceModel.findOneAndUpdate(
                { userId },
                { $set: { preferences: updatedPrefs } },
                { upsert: true, new: true }
            );

            inMemoryPrefs.set(userId, updatedPrefs);
            return { success: true, data: updatedPrefs };
        } catch (err: any) {
            console.warn('AlertService: Updating in-memory preferences fallback', err);
            const current = inMemoryPrefs.get(userId) || DEFAULT_ALERT_PREFERENCES;
            const updated: AlertNotificationPreferences = {
                ...current,
                ...preferences,
                enabledCategories: {
                    ...current.enabledCategories,
                    ...(preferences.enabledCategories || {}),
                },
            };
            inMemoryPrefs.set(userId, updated);
            return { success: true, data: updated };
        }
    }

    async markAlertRead(userId: string, alertId: string): Promise<ApiResult<boolean>> {
        try {
            await connectToDatabase();
            await AlertPreferenceModel.findOneAndUpdate(
                { userId },
                { $addToSet: { readAlertIds: alertId } },
                { upsert: true }
            );
        } catch (err) {
            console.warn('AlertService: DB write error during markAlertRead', err);
        }

        if (!inMemoryReadAlerts.has(userId)) {
            inMemoryReadAlerts.set(userId, new Set<string>());
        }
        inMemoryReadAlerts.get(userId)!.add(alertId);

        return { success: true, data: true };
    }

    async markAllAlertsRead(userId: string): Promise<ApiResult<boolean>> {
        // Fetch current smart alerts to collect their IDs
        const alertsRes = await this.getSmartAlerts(userId);
        if (!alertsRes.success) return { success: false, error: alertsRes.error };

        const allIds = alertsRes.data.map((a) => a.id);

        try {
            await connectToDatabase();
            await AlertPreferenceModel.findOneAndUpdate(
                { userId },
                { $addToSet: { readAlertIds: { $each: allIds } } },
                { upsert: true }
            );
        } catch (err) {
            console.warn('AlertService: DB write error during markAllAlertsRead', err);
        }

        if (!inMemoryReadAlerts.has(userId)) {
            inMemoryReadAlerts.set(userId, new Set<string>());
        }
        allIds.forEach((id) => inMemoryReadAlerts.get(userId)!.add(id));

        return { success: true, data: true };
    }

    async getSmartAlerts(
        userId: string,
        categoryFilter?: SmartAlertCategory,
        unreadOnly?: boolean
    ): Promise<ApiResult<SmartAlertItem[]>> {
        try {
            // 1. Get user preferences and read IDs
            const prefsRes = await this.getUserAlertPreferences(userId);
            const prefs = prefsRes.success ? prefsRes.data : DEFAULT_ALERT_PREFERENCES;

            let readAlertIds = new Set<string>();
            try {
                await connectToDatabase();
                const prefDoc = await AlertPreferenceModel.findOne({ userId }).lean();
                if (prefDoc && (prefDoc as any).readAlertIds) {
                    (prefDoc as any).readAlertIds.forEach((id: string) => readAlertIds.add(id));
                }
            } catch {
                const mem = inMemoryReadAlerts.get(userId);
                if (mem) readAlertIds = new Set(mem);
            }

            // 2. Fetch user portfolio data for portfolio risk alerts
            let positions: any[] = [];
            let summary: any = undefined;
            try {
                const portfolioService = getPortfolioService();
                const posRes = await portfolioService.getPositions(userId);
                if (posRes.success && posRes.data.length > 0) {
                    positions = posRes.data;
                    summary = await portfolioService.calculatePortfolioSummary(positions);
                }
            } catch (err) {
                console.warn('AlertService: Could not load portfolio data for smart alerts', err);
            }

            // 3. Fetch user personalization context for watchlist
            let watchlistSymbols: string[] = [];
            try {
                const personalizationService = getPersonalizationService();
                const profileRes = await personalizationService.getUserProfile(userId);
                if (profileRes.success && profileRes.data.favoriteStocks) {
                    watchlistSymbols = profileRes.data.favoriteStocks;
                }
            } catch (err) {
                console.warn('AlertService: Could not load watchlist for smart alerts', err);
            }

            // 4. Fetch quotes for tracked symbols
            const symbolsToQuote = Array.from(
                new Set([
                    ...positions.map((p) => p.symbol),
                    ...watchlistSymbols,
                    'NVDA',
                    'AAPL',
                    'MSFT',
                    'TSLA',
                ])
            );

            const marketService = getMarketService();
            const quotesMap: Record<string, StockQuote> = {};

            await Promise.all(
                symbolsToQuote.map(async (sym) => {
                    try {
                        const q = await marketService.getQuote(sym);
                        if (q.success) {
                            quotesMap[sym] = q.data;
                        }
                    } catch {
                        // ignore
                    }
                })
            );

            // 5. Generate contextual smart alerts
            let rawAlerts = SmartAlertGenerator.generateAlerts({
                userId,
                portfolioPositions: positions,
                portfolioSummary: summary,
                watchlistSymbols,
                quotes: quotesMap,
                readAlertIds,
            });

            // 6. Filter by user category preferences
            rawAlerts = rawAlerts.filter((alert) => {
                const isEnabled = prefs.enabledCategories[alert.category] !== false;
                return isEnabled;
            });

            // 7. Filter by minimum severity
            const minSeverityScore = SEVERITY_LEVELS[prefs.minSeverity] || 1;
            rawAlerts = rawAlerts.filter((alert) => {
                return (SEVERITY_LEVELS[alert.severity] || 1) >= minSeverityScore;
            });

            // 8. Filter by query category if specified
            if (categoryFilter) {
                rawAlerts = rawAlerts.filter((a) => a.category === categoryFilter);
            }

            // 9. Filter by unreadOnly if specified
            if (unreadOnly) {
                rawAlerts = rawAlerts.filter((a) => !a.isRead);
            }

            // 10. Prioritize and sort
            const sorted = sortAlertsByPriority(rawAlerts);

            return { success: true, data: sorted };
        } catch (err: any) {
            console.error('AlertService.getSmartAlerts error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to generate smart alerts',
                code: 'SMART_ALERT_ERROR',
            };
        }
    }
}
