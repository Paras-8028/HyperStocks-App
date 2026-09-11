import { IPortfolioService } from './IPortfolioService';
import { ApiResult } from '@/types/api';
import { PortfolioPosition, PortfolioSummary } from '@/types/portfolio';
import { connectToDatabase } from '@/database/mongoose';
import { PortfolioPositionModel } from '@/database/models/portfolio.model';
import { getMarketService } from '@/services/market';

export class PortfolioService implements IPortfolioService {
    async getPositions(userId: string): Promise<ApiResult<PortfolioPosition[]>> {
        try {
            await connectToDatabase();
            const docs = await PortfolioPositionModel.find({ userId })
                .sort({ createdAt: -1 })
                .lean();

            const marketService = getMarketService();

            // Enrich positions with live quote data
            const enriched: PortfolioPosition[] = await Promise.all(
                docs.map(async (doc: any) => {
                    const symbol = doc.symbol.toUpperCase();
                    let currentPrice = doc.costBasis;

                    try {
                        const quoteRes = await marketService.getQuote(symbol);
                        if (quoteRes.success && quoteRes.data.currentPrice > 0) {
                            currentPrice = quoteRes.data.currentPrice;
                        }
                    } catch {
                        // fallback to costBasis if quote fails
                    }

                    const shares = Number(doc.shares) || 0;
                    const costBasis = Number(doc.costBasis) || 0;
                    const totalCost = shares * costBasis;
                    const marketValue = shares * currentPrice;
                    const unrealizedGainLoss = marketValue - totalCost;
                    const unrealizedGainLossPercent =
                        totalCost > 0 ? (unrealizedGainLoss / totalCost) * 100 : 0;

                    return {
                        id: String(doc._id),
                        userId: doc.userId,
                        symbol,
                        shares,
                        costBasis,
                        buyDate: doc.buyDate ? new Date(doc.buyDate).toISOString() : undefined,
                        notes: doc.notes,
                        currentPrice,
                        marketValue,
                        totalCost,
                        unrealizedGainLoss,
                        unrealizedGainLossPercent,
                    };
                })
            );

            // Compute allocation percentage
            const grandTotal = enriched.reduce((sum, p) => sum + (p.marketValue || 0), 0);
            if (grandTotal > 0) {
                enriched.forEach((p) => {
                    p.allocationPercent = ((p.marketValue || 0) / grandTotal) * 100;
                });
            }

            return {
                success: true,
                data: enriched,
            };
        } catch (err: any) {
            console.error('PortfolioService.getPositions error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to fetch portfolio positions',
                code: 'DB_ERROR',
            };
        }
    }

    async addPosition(
        userId: string,
        input: { symbol: string; shares: number; costBasis: number; notes?: string }
    ): Promise<ApiResult<PortfolioPosition>> {
        try {
            await connectToDatabase();

            const doc = await PortfolioPositionModel.create({
                userId,
                symbol: input.symbol.toUpperCase().trim(),
                shares: input.shares,
                costBasis: input.costBasis,
                notes: input.notes,
            });

            return {
                success: true,
                data: {
                    id: String(doc._id),
                    userId: doc.userId,
                    symbol: doc.symbol,
                    shares: doc.shares,
                    costBasis: doc.costBasis,
                    notes: doc.notes,
                    buyDate: doc.buyDate?.toISOString(),
                },
            };
        } catch (err: any) {
            console.error('PortfolioService.addPosition error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to create portfolio position',
                code: 'DB_ERROR',
            };
        }
    }

    async removePosition(
        userId: string,
        positionId: string
    ): Promise<ApiResult<boolean>> {
        try {
            await connectToDatabase();
            await PortfolioPositionModel.deleteOne({ _id: positionId, userId });
            return { success: true, data: true };
        } catch (err: any) {
            console.error('PortfolioService.removePosition error:', err);
            return {
                success: false,
                error: err?.message || 'Failed to remove position',
                code: 'DB_ERROR',
            };
        }
    }

    async calculatePortfolioSummary(
        positions: PortfolioPosition[]
    ): Promise<PortfolioSummary> {
        let totalValue = 0;
        let totalCost = 0;
        let topPerformer: PortfolioSummary['topPerformer'] = undefined;
        let worstPerformer: PortfolioSummary['worstPerformer'] = undefined;
        const sectorAllocation: Record<string, number> = {};

        for (const pos of positions) {
            const mv = pos.marketValue ?? pos.shares * (pos.currentPrice ?? pos.costBasis);
            const tc = pos.totalCost ?? pos.shares * pos.costBasis;
            totalValue += mv;
            totalCost += tc;

            const gainPercent = pos.unrealizedGainLossPercent ?? 0;
            if (!topPerformer || gainPercent > topPerformer.gainPercent) {
                topPerformer = { symbol: pos.symbol, gainPercent };
            }
            if (!worstPerformer || gainPercent < worstPerformer.lossPercent) {
                worstPerformer = { symbol: pos.symbol, lossPercent: gainPercent };
            }
        }

        const totalUnrealizedGainLoss = totalValue - totalCost;
        const totalGainLossPercent =
            totalCost > 0 ? (totalUnrealizedGainLoss / totalCost) * 100 : 0;

        return {
            totalValue,
            totalCost,
            totalUnrealizedGainLoss,
            totalGainLossPercent,
            positionCount: positions.length,
            topPerformer,
            worstPerformer,
            sectorAllocation,
        };
    }
}
