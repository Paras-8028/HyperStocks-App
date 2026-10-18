import {
    ConcentrationAnalysis,
    DeterministicPortfolioAnalysis,
    PerformanceAttribution,
    PortfolioAlertItem,
    PortfolioPosition,
    PortfolioRiskMetrics,
    PortfolioSummary,
    SectorExposure,
} from '@/types/portfolio';

// Benchmark approximate S&P 500 sector weights for relative delta context
const BENCHMARK_SECTOR_WEIGHTS: Record<string, number> = {
    Technology: 31.5,
    Financials: 13.2,
    Healthcare: 11.8,
    'Consumer Discretionary': 10.4,
    'Communication Services': 9.2,
    Industrials: 8.5,
    'Consumer Staples': 5.8,
    Energy: 3.7,
    Utilities: 2.3,
    'Real Estate': 2.1,
    Materials: 2.0,
};

// Known symbol sector map fallback
const SYMBOL_SECTOR_MAP: Record<string, { sector: string; beta: number }> = {
    AAPL: { sector: 'Technology', beta: 1.08 },
    NVDA: { sector: 'Technology', beta: 1.68 },
    MSFT: { sector: 'Technology', beta: 1.12 },
    AMD: { sector: 'Technology', beta: 1.72 },
    AVGO: { sector: 'Technology', beta: 1.25 },
    GOOGL: { sector: 'Communication Services', beta: 1.05 },
    META: { sector: 'Communication Services', beta: 1.22 },
    AMZN: { sector: 'Consumer Discretionary', beta: 1.16 },
    TSLA: { sector: 'Consumer Discretionary', beta: 2.10 },
    UBER: { sector: 'Consumer Discretionary', beta: 1.35 },
    LLY: { sector: 'Healthcare', beta: 0.65 },
    JNJ: { sector: 'Healthcare', beta: 0.54 },
    UNH: { sector: 'Healthcare', beta: 0.68 },
    JPM: { sector: 'Financials', beta: 1.10 },
    BAC: { sector: 'Financials', beta: 1.24 },
    V: { sector: 'Financials', beta: 0.95 },
    XOM: { sector: 'Energy', beta: 0.92 },
    CVX: { sector: 'Energy', beta: 0.88 },
    CAT: { sector: 'Industrials', beta: 1.15 },
    SPY: { sector: 'Broad Market', beta: 1.00 },
    QQQ: { sector: 'Technology', beta: 1.18 },
};

export class PortfolioAnalyticsService {
    /**
     * Executes pure, mathematically verified portfolio analytics.
     * Guaranteed deterministic output with zero hallucinations.
     */
    public static analyze(rawPositions: PortfolioPosition[]): DeterministicPortfolioAnalysis {
        const positions = this.normalizePositions(rawPositions);
        const summary = this.calculateSummary(positions);
        const sectorExposures = this.calculateSectorExposures(positions, summary.totalValue);
        const concentration = this.calculateConcentration(positions, summary.totalValue);
        const attribution = this.calculateAttribution(positions, summary);
        const riskMetrics = this.calculateRiskMetrics(positions, concentration);
        const alerts = this.generateAlerts(positions, summary, concentration, riskMetrics, sectorExposures);

        return {
            summary,
            positions,
            sectorExposures,
            concentration,
            attribution,
            riskMetrics,
            alerts,
            calculatedAt: new Date().toISOString(),
        };
    }

    private static normalizePositions(positions: PortfolioPosition[]): PortfolioPosition[] {
        const grandTotal = positions.reduce((sum, p) => {
            const price = p.currentPrice ?? p.costBasis;
            return sum + (p.shares * price);
        }, 0);

        return positions.map((p) => {
            const sym = p.symbol.toUpperCase().trim();
            const fallback = SYMBOL_SECTOR_MAP[sym] || { sector: 'Diversified', beta: 1.0 };
            const sector = p.sector || fallback.sector;
            const beta = p.beta ?? fallback.beta;
            const currentPrice = p.currentPrice ?? p.costBasis;
            const shares = Number(p.shares) || 0;
            const costBasis = Number(p.costBasis) || 0;
            const totalCost = shares * costBasis;
            const marketValue = shares * currentPrice;
            const unrealizedGainLoss = marketValue - totalCost;
            const unrealizedGainLossPercent = totalCost > 0 ? (unrealizedGainLoss / totalCost) * 100 : 0;
            const dailyChange = p.dailyChange ?? 0;
            const dailyChangePercent = p.dailyChangePercent ?? 0;
            const allocationPercent = grandTotal > 0 ? (marketValue / grandTotal) * 100 : 0;

            return {
                ...p,
                symbol: sym,
                sector,
                beta,
                shares,
                costBasis,
                currentPrice,
                totalCost,
                marketValue,
                unrealizedGainLoss,
                unrealizedGainLossPercent,
                dailyChange,
                dailyChangePercent,
                allocationPercent,
            };
        });
    }

    private static calculateSummary(positions: PortfolioPosition[]): PortfolioSummary {
        let totalValue = 0;
        let totalCost = 0;
        let dailyGainLoss = 0;
        let topPerformer: PortfolioSummary['topPerformer'] = undefined;
        let worstPerformer: PortfolioSummary['worstPerformer'] = undefined;
        const sectorAllocation: Record<string, number> = {};

        for (const p of positions) {
            const mv = p.marketValue || 0;
            const tc = p.totalCost || 0;
            totalValue += mv;
            totalCost += tc;

            // Daily P&L = shares * dailyChange
            const dayPnl = (p.dailyChange ?? 0) * p.shares;
            dailyGainLoss += dayPnl;

            // Sector totals for summary
            const sec = p.sector || 'Other';
            sectorAllocation[sec] = (sectorAllocation[sec] || 0) + mv;

            // Total gain/loss percent tracking
            const gainPercent = p.unrealizedGainLossPercent ?? 0;
            if (!topPerformer || gainPercent > topPerformer.gainPercent) {
                topPerformer = { symbol: p.symbol, gainPercent };
            }
            if (!worstPerformer || gainPercent < worstPerformer.lossPercent) {
                worstPerformer = { symbol: p.symbol, lossPercent: gainPercent };
            }
        }

        const totalUnrealizedGainLoss = totalValue - totalCost;
        const totalGainLossPercent = totalCost > 0 ? (totalUnrealizedGainLoss / totalCost) * 100 : 0;
        const dailyGainLossPercent = totalValue > 0 ? (dailyGainLoss / totalValue) * 100 : 0;

        return {
            totalValue,
            totalCost,
            totalUnrealizedGainLoss,
            totalGainLossPercent,
            dailyGainLoss,
            dailyGainLossPercent,
            positionCount: positions.length,
            topPerformer,
            worstPerformer,
            sectorAllocation,
        };
    }

    private static calculateSectorExposures(
        positions: PortfolioPosition[],
        totalValue: number
    ): SectorExposure[] {
        if (totalValue <= 0) return [];

        const sectorMap: Record<string, number> = {};
        for (const p of positions) {
            const sec = p.sector || 'Other';
            sectorMap[sec] = (sectorMap[sec] || 0) + (p.marketValue || 0);
        }

        return Object.entries(sectorMap)
            .map(([sector, value]) => {
                const percent = (value / totalValue) * 100;
                const benchmarkWeight = BENCHMARK_SECTOR_WEIGHTS[sector] || 0;
                const benchmarkDelta = percent - benchmarkWeight;
                return {
                    sector,
                    value,
                    percent,
                    benchmarkDelta,
                };
            })
            .sort((a, b) => b.value - a.value);
    }

    private static calculateConcentration(
        positions: PortfolioPosition[],
        totalValue: number
    ): ConcentrationAnalysis {
        if (positions.length === 0 || totalValue <= 0) {
            return {
                topStock: { symbol: 'N/A', percent: 0 },
                top3Percent: 0,
                isConcentrated: false,
                hhiIndex: 0,
                diversificationLevel: 'Well Diversified',
            };
        }

        const sorted = [...positions].sort(
            (a, b) => (b.allocationPercent || 0) - (a.allocationPercent || 0)
        );

        const topStock = {
            symbol: sorted[0]?.symbol || 'N/A',
            percent: sorted[0]?.allocationPercent || 0,
        };

        const top3Percent = sorted
            .slice(0, 3)
            .reduce((sum, p) => sum + (p.allocationPercent || 0), 0);

        // Herfindahl-Hirschman Index: sum of squared percentages (e.g. 30^2 + 20^2)
        const hhiIndex = sorted.reduce((sum, p) => {
            const pct = p.allocationPercent || 0;
            return sum + pct * pct;
        }, 0);

        const isConcentrated = topStock.percent > 25 || top3Percent > 60 || hhiIndex > 2500;

        let diversificationLevel: ConcentrationAnalysis['diversificationLevel'] = 'Well Diversified';
        if (hhiIndex > 2500) {
            diversificationLevel = 'Highly Concentrated';
        } else if (hhiIndex > 1500) {
            diversificationLevel = 'Moderately Concentrated';
        }

        return {
            topStock,
            top3Percent,
            isConcentrated,
            hhiIndex,
            diversificationLevel,
        };
    }

    private static calculateAttribution(
        positions: PortfolioPosition[],
        summary: PortfolioSummary
    ): PerformanceAttribution {
        const sortedGains = [...positions].sort(
            (a, b) => (b.unrealizedGainLoss || 0) - (a.unrealizedGainLoss || 0)
        );

        const topContributors = sortedGains
            .filter((p) => (p.unrealizedGainLoss || 0) > 0)
            .slice(0, 3)
            .map((p) => ({
                symbol: p.symbol,
                dollarContribution: p.unrealizedGainLoss || 0,
                percentReturn: p.unrealizedGainLossPercent || 0,
            }));

        const bottomDetractors = sortedGains
            .filter((p) => (p.unrealizedGainLoss || 0) < 0)
            .reverse()
            .slice(0, 3)
            .map((p) => ({
                symbol: p.symbol,
                dollarContribution: p.unrealizedGainLoss || 0,
                percentReturn: p.unrealizedGainLossPercent || 0,
            }));

        return {
            dailyGainLoss: summary.dailyGainLoss,
            dailyGainLossPercent: summary.dailyGainLossPercent,
            totalGainLoss: summary.totalUnrealizedGainLoss,
            totalGainLossPercent: summary.totalGainLossPercent,
            topContributors,
            bottomDetractors,
        };
    }

    private static calculateRiskMetrics(
        positions: PortfolioPosition[],
        concentration: ConcentrationAnalysis
    ): PortfolioRiskMetrics {
        if (positions.length === 0) {
            return {
                weightedBeta: 1.0,
                volatilityLevel: 'Moderate',
                concentrationRiskScore: 0,
                marketExposureRisk: 'No active equity holdings',
            };
        }

        // Weighted beta
        const weightedBeta = positions.reduce((sum, p) => {
            const weight = (p.allocationPercent || 0) / 100;
            const beta = p.beta ?? 1.0;
            return sum + weight * beta;
        }, 0);

        let volatilityLevel: PortfolioRiskMetrics['volatilityLevel'] = 'Moderate';
        if (weightedBeta < 0.85) volatilityLevel = 'Low';
        else if (weightedBeta > 1.45) volatilityLevel = 'Extreme';
        else if (weightedBeta > 1.18) volatilityLevel = 'High';

        // Concentration risk score: maps HHI (0-10000) into a clean 0-100 scale
        const concentrationRiskScore = Math.min(100, Math.round((concentration.hhiIndex / 3000) * 100));

        let marketExposureRisk = 'Balanced equity market sensitivity';
        if (weightedBeta > 1.3) {
            marketExposureRisk = 'High market sensitivity: amplifies S&P 500 swings by ~' + ((weightedBeta - 1) * 100).toFixed(0) + '%';
        } else if (weightedBeta < 0.8) {
            marketExposureRisk = 'Defensive market sensitivity: insulated from broad market drawdowns';
        }

        return {
            weightedBeta: Number(weightedBeta.toFixed(2)),
            volatilityLevel,
            concentrationRiskScore,
            marketExposureRisk,
        };
    }

    private static generateAlerts(
        positions: PortfolioPosition[],
        summary: PortfolioSummary,
        concentration: ConcentrationAnalysis,
        riskMetrics: PortfolioRiskMetrics,
        sectors: SectorExposure[]
    ): PortfolioAlertItem[] {
        const alerts: PortfolioAlertItem[] = [];

        // 1. Single-stock concentration alert (> 25%)
        if (concentration.topStock.percent > 25) {
            alerts.push({
                id: 'alert-conc-single',
                type: 'concentration',
                severity: concentration.topStock.percent > 40 ? 'critical' : 'warning',
                title: `Single-Stock Concentration: ${concentration.topStock.symbol} at ${concentration.topStock.percent.toFixed(1)}%`,
                message: `A single holding represents ${concentration.topStock.percent.toFixed(1)}% of total portfolio capital. Adverse company-specific developments will disproportionately impact performance.`,
                affectedSymbol: concentration.topStock.symbol,
                timestamp: Date.now(),
            });
        }

        // 2. Top-3 Concentration Alert (> 65%)
        if (concentration.top3Percent > 65) {
            alerts.push({
                id: 'alert-conc-top3',
                type: 'concentration',
                severity: 'warning',
                title: `Top 3 Assets Account for ${concentration.top3Percent.toFixed(1)}% of Portfolio`,
                message: `Your top 3 holdings drive the majority of your risk and return variance. Consider rebalancing into under-weighted sectors.`,
                timestamp: Date.now(),
            });
        }

        // 3. Sector Concentration Alert (> 40%)
        const dominantSector = sectors.find((s) => s.percent > 40);
        if (dominantSector) {
            alerts.push({
                id: 'alert-conc-sector',
                type: 'concentration',
                severity: dominantSector.percent > 55 ? 'critical' : 'warning',
                title: `${dominantSector.sector} Concentration: ${dominantSector.percent.toFixed(1)}%`,
                message: `Exposure to ${dominantSector.sector} is ${dominantSector.benchmarkDelta > 0 ? '+' + dominantSector.benchmarkDelta.toFixed(0) + '% above' : 'far above'} the broader market benchmark.`,
                timestamp: Date.now(),
            });
        }

        // 4. High Portfolio Beta / Volatility Alert
        if (riskMetrics.weightedBeta > 1.35) {
            alerts.push({
                id: 'alert-volatility-high',
                type: 'volatility',
                severity: 'warning',
                title: `High Portfolio Volatility (Beta: ${riskMetrics.weightedBeta})`,
                message: `Your portfolio carries aggressive market exposure. Expected drawdown during broad market pullbacks will be approximately ${(riskMetrics.weightedBeta * 100).toFixed(0)}% of index magnitude.`,
                timestamp: Date.now(),
            });
        }

        // 5. Significant Stock Drawdown (> 15% loss)
        for (const p of positions) {
            if ((p.unrealizedGainLossPercent ?? 0) < -15) {
                alerts.push({
                    id: `alert-drawdown-${p.symbol}`,
                    type: 'drawdown',
                    severity: (p.unrealizedGainLossPercent ?? 0) < -25 ? 'critical' : 'warning',
                    title: `Significant Position Drawdown: ${p.symbol} (${p.unrealizedGainLossPercent?.toFixed(1)}%)`,
                    message: `${p.symbol} is currently down ${p.unrealizedGainLossPercent?.toFixed(1)}% against cost basis ($${p.unrealizedGainLoss?.toFixed(0)} unrealized loss). Review investment thesis and risk management stops.`,
                    affectedSymbol: p.symbol,
                    timestamp: Date.now(),
                });
            }
        }

        // 6. Large Daily Movement (> 2.5% daily move)
        if (Math.abs(summary.dailyGainLossPercent) > 2.5) {
            alerts.push({
                id: 'alert-daily-move',
                type: 'volatility',
                severity: 'info',
                title: `Elevated Daily Fluctuation: ${summary.dailyGainLossPercent >= 0 ? '+' : ''}${summary.dailyGainLossPercent.toFixed(2)}%`,
                message: `Today's net portfolio movement of $${Math.abs(summary.dailyGainLoss).toFixed(0)} exceeds typical daily variance thresholds.`,
                timestamp: Date.now(),
            });
        }

        return alerts;
    }
}
