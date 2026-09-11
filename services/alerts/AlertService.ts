import { IAlertService } from './IAlertService';
import { ApiResult } from '@/types/api';
import { AlertEntity, CreateAlertInput } from '@/types/alerts';
import { connectToDatabase } from '@/database/mongoose';
import { AlertModel } from '@/database/models/alert.model';
import { getMarketService } from '@/services/market';

export class AlertService implements IAlertService {
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
}
