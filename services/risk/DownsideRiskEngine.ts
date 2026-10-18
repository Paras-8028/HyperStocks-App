import { StockCandlesResult, StockQuote } from '@/types/market';
import {
    DownsideRiskAssessment,
    RiskIndicatorMeasurement,
    MovingAverageBreakdownData,
    ProximityToLowData,
    VolatilityExpansionData,
    TriggeredRiskCondition,
    RiskSeverity,
    RiskDataQuality,
} from '@/types/risk';

export class DownsideRiskEngine {
    public static readonly VERSION = '1.0.0-phase3';
    public static readonly TRADING_DAYS_PER_YEAR = 252;

    /**
     * Computes daily percentage returns from a chronological sequence of closing prices.
     * r_t = (P_t - P_{t-1}) / P_{t-1}
     */
    public static calculateDailyReturns(closes: number[]): number[] {
        if (!closes || closes.length < 2) return [];
        const returns: number[] = [];
        for (let i = 1; i < closes.length; i++) {
            const prev = closes[i - 1];
            const curr = closes[i];
            if (prev > 0 && curr > 0) {
                returns.push((curr - prev) / prev);
            }
        }
        return returns;
    }

    /**
     * Calculates sample mean of an array of numbers.
     */
    public static mean(values: number[]): number {
        if (values.length === 0) return 0;
        const sum = values.reduce((acc, v) => acc + v, 0);
        return sum / values.length;
    }

    /**
     * Calculates annualized historical volatility from daily returns.
     * formula: sqrt( 1/(N-1) * sum( (r_i - mean)^2 ) ) * sqrt(252) * 100
     */
    public static calculateAnnualizedVolatility(returns: number[]): number | null {
        if (!returns || returns.length < 2) return null;
        const avg = this.mean(returns);
        const sumSqDiff = returns.reduce((acc, r) => acc + Math.pow(r - avg, 2), 0);
        const dailyStdDev = Math.sqrt(sumSqDiff / (returns.length - 1));
        const annualizedVol = dailyStdDev * Math.sqrt(this.TRADING_DAYS_PER_YEAR) * 100;
        return Number(annualizedVol.toFixed(2));
    }

    /**
     * Calculates historical 95% Value at Risk (VaR) from daily returns.
     * Sign convention: reported as a positive estimated loss percentage magnitude.
     * Note: VaR represents a loss quantile threshold, NOT the maximum possible loss.
     */
    public static calculateHistoricalVaR95(returns: number[]): number | null {
        if (!returns || returns.length < 20) return null; // Minimum sample size for 5th percentile
        const sorted = [...returns].sort((a, b) => a - b);
        // Linear interpolation for 5th percentile
        const index = 0.05 * (sorted.length - 1);
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.ceil(index);
        const weight = index - lowerIndex;

        const p05Return =
            lowerIndex === upperIndex
                ? sorted[lowerIndex]
                : sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;

        // Express as a positive loss percentage magnitude
        const varPercent = Math.max(0, -p05Return * 100);
        return Number(varPercent.toFixed(2));
    }

    /**
     * Calculates historical 95% Conditional Value at Risk (CVaR / Expected Shortfall).
     * Represents the expected average loss in the adverse 5% historical tail.
     * Note: Past tail losses are not guaranteed forecasts of future catastrophic moves.
     */
    public static calculateHistoricalCVaR95(returns: number[], var95Percent: number): number | null {
        if (!returns || returns.length < 20) return null;
        const thresholdReturn = -(var95Percent / 100);
        const tailReturns = returns.filter((r) => r <= thresholdReturn);

        if (tailReturns.length === 0) {
            return var95Percent;
        }

        const avgTailReturn = this.mean(tailReturns);
        const cvarPercent = Math.max(var95Percent, -avgTailReturn * 100);
        return Number(cvarPercent.toFixed(2));
    }

    /**
     * Calculates the maximum peak-to-trough decline over a price series.
     * Optionally factors in a live intraday quote without mutating the historical candle series.
     * formula: max_{t} ( (max_{s <= t} P_s - P_t) / max_{s <= t} P_s ) * 100
     */
    public static calculateMaximumDrawdown(closes: number[], liveQuotePrice?: number): number | null {
        if (!closes || closes.length < 2) return null;
        let peak = closes[0];
        let maxDrawdown = 0;

        for (const price of closes) {
            if (price > peak) {
                peak = price;
            } else if (peak > 0) {
                const drawdown = ((peak - price) / peak) * 100;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
            }
        }

        // Evaluate live price against historical peak if supplied
        if (typeof liveQuotePrice === 'number' && liveQuotePrice > 0 && peak > 0) {
            const liveDrawdown = ((peak - liveQuotePrice) / peak) * 100;
            if (liveDrawdown > maxDrawdown) {
                maxDrawdown = liveDrawdown;
            }
        }

        return Number(maxDrawdown.toFixed(2));
    }

    /**
     * Evaluates whether the reference price is confirmed below its moving average (e.g. 200-day or 50-day SMA).
     * Calculates SMA strictly from completed historical daily closes.
     */
    public static evaluateMovingAverageBreakdown(
        closes: number[],
        period = 200,
        referencePrice?: number
    ): MovingAverageBreakdownData | null {
        if (!closes || closes.length < period) return null;

        const windowSlice = closes.slice(closes.length - period);
        const sma = this.mean(windowSlice);
        const priceToEvaluate =
            typeof referencePrice === 'number' && referencePrice > 0
                ? referencePrice
                : closes[closes.length - 1];

        const isBreakdown = priceToEvaluate < sma;
        const percentBelow = isBreakdown ? ((sma - priceToEvaluate) / sma) * 100 : 0;

        return {
            periodDays: period,
            movingAveragePrice: Number(sma.toFixed(2)),
            currentPrice: Number(priceToEvaluate.toFixed(2)),
            percentBelow: Number(percentBelow.toFixed(2)),
            isBreakdown,
        };
    }

    /**
     * Evaluates proximity to the historical low over an observation period (e.g. 252 days / 52 weeks).
     * Calculates historical trailing low strictly from completed historical closes.
     */
    public static evaluateProximityToLow(
        closes: number[],
        period = 252,
        referencePrice?: number
    ): ProximityToLowData | null {
        if (!closes || closes.length < 20) return null;

        const effectivePeriod = Math.min(closes.length, period);
        const windowSlice = closes.slice(closes.length - effectivePeriod);
        const minPrice = Math.min(...windowSlice);
        const priceToEvaluate =
            typeof referencePrice === 'number' && referencePrice > 0
                ? referencePrice
                : closes[closes.length - 1];

        const percentAboveLow = minPrice > 0 ? ((priceToEvaluate - minPrice) / minPrice) * 100 : 0;
        const isNearLow = percentAboveLow <= 5.0; // Within 5% of low

        return {
            periodDays: effectivePeriod,
            historicalLowPrice: Number(minPrice.toFixed(2)),
            currentPrice: Number(priceToEvaluate.toFixed(2)),
            percentAboveLow: Number(percentAboveLow.toFixed(2)),
            isNearLow,
        };
    }

    /**
     * Compares recent short-term volatility against a longer baseline to detect volatility expansion.
     */
    public static evaluateVolatilityExpansion(
        returns: number[],
        shortTermDays = 21,
        baselineDays = 63
    ): VolatilityExpansionData | null {
        if (!returns || returns.length < baselineDays) return null;

        const shortTermSlice = returns.slice(returns.length - shortTermDays);
        const baselineSlice = returns.slice(returns.length - baselineDays);

        const shortVol = this.calculateAnnualizedVolatility(shortTermSlice);
        const baseVol = this.calculateAnnualizedVolatility(baselineSlice);

        if (shortVol === null || baseVol === null || baseVol <= 0) return null;

        const ratio = shortVol / baseVol;
        const isExpanding = ratio >= 1.30; // 30%+ expansion over baseline

        return {
            shortTermPeriodDays: shortTermDays,
            shortTermVolatility: shortVol,
            baselinePeriodDays: baselineDays,
            baselineVolatility: baseVol,
            expansionRatio: Number(ratio.toFixed(2)),
            isExpanding,
        };
    }

    /**
     * Performs a comprehensive, transparent quantitative downside-risk assessment
     * for a stock based on verified historical market data.
     */
    public static assessDownsideRisk(
        symbol: string,
        companyName: string = symbol,
        candles?: StockCandlesResult | null,
        quote?: StockQuote | null
    ): DownsideRiskAssessment {
        const cleanSymbol = symbol.trim().toUpperCase();
        const now = Date.now();
        const calculationVersion = this.VERSION;

        const emptyAssessment = (quality: RiskDataQuality, reason: string): DownsideRiskAssessment => ({
            symbol: cleanSymbol,
            companyName,
            currentPrice: quote?.currentPrice || 0,
            assessmentTimestamp: now,
            dataFreshness: 'No usable market candle data returned by provider',
            dataWindow: { fromTimestamp: 0, toTimestamp: 0, totalCandles: 0, validPriceObservations: 0 },
            overallDataQuality: quality,
            historicalVolatility21d: this.createMissingIndicator('21-Day Historical Volatility', '21 Trading Days', 21, reason),
            historicalVolatility63d: this.createMissingIndicator('63-Day Historical Volatility', '63 Trading Days', 63, reason),
            historicalVaR95: this.createMissingIndicator('95% Daily Value at Risk (VaR)', '63 Trading Days', 40, reason),
            historicalCVaR95: this.createMissingIndicator('95% Conditional Value at Risk (CVaR)', '63 Trading Days', 40, reason),
            maximumDrawdown: this.createMissingIndicator('Maximum Drawdown', 'Full Available Window', 20, reason),
            movingAverageBreakdown: this.createMissingIndicator('200-Day Moving Average Breakdown', '200 Trading Days', 200, reason),
            proximityToLow: this.createMissingIndicator('Proximity to 52-Week Low', '252 Trading Days', 60, reason),
            volatilityExpansion: this.createMissingIndicator('Volatility Expansion Ratio', '21d vs 63d Baseline', 63, reason),
            triggeredConditions: [],
            overallRiskSeverity: 'low',
            experimentalRiskScore: 0,
            scoreInterpretation: `Risk assessment unavailable: ${reason}`,
            summary: `Quantitative downside-risk monitoring could not be completed for ${cleanSymbol} due to ${reason}.`,
            methodologyNotes: ['Data quality check failed before risk evaluation.'],
            calculationVersion,
        });

        if (!candles || candles.status === 'no_data' || !candles.close || candles.close.length === 0) {
            return emptyAssessment('unavailable', 'insufficient or unavailable historical candle records from Finnhub');
        }

        const validCloses = candles.close.filter((c) => typeof c === 'number' && !isNaN(c) && c > 0);
        const validTimestamps = candles.timestamps.filter((t) => typeof t === 'number' && !isNaN(t) && t > 0);

        if (validCloses.length < 15) {
            return emptyAssessment('insufficient', `only ${validCloses.length} valid price observations available (minimum 15 required)`);
        }

        // Distinctly identify whether a live intraday quote is supplied
        const hasLiveQuote = typeof quote?.currentPrice === 'number' && quote.currentPrice > 0;
        const currentPrice = hasLiveQuote
            ? quote!.currentPrice
            : validCloses[validCloses.length - 1];
        const referencePriceType: 'completed_daily_close' | 'live_intraday_quote' = hasLiveQuote
            ? 'live_intraday_quote'
            : 'completed_daily_close';

        // Historical daily closes remain strictly intact — completed daily bars are NEVER overwritten
        const historicalCloses = [...validCloses];
        const returns = this.calculateDailyReturns(historicalCloses);
        const totalObservations = historicalCloses.length;
        const fromTs = validTimestamps[0] ? validTimestamps[0] * 1000 : now - totalObservations * 86400000;
        const toTs = validTimestamps[validTimestamps.length - 1] ? validTimestamps[validTimestamps.length - 1] * 1000 : now;

        const triggeredConditions: TriggeredRiskCondition[] = [];

        // 1. 21-Day Volatility
        const vol21Returns = returns.slice(Math.max(0, returns.length - 21));
        const vol21Value = this.calculateAnnualizedVolatility(vol21Returns);
        const vol21Triggered = vol21Value !== null && vol21Value >= 45.0; // 45%+ annualized volatility
        const vol21Measurement: RiskIndicatorMeasurement<number> = {
            indicatorName: '21-Day Historical Volatility',
            value: vol21Value,
            displayValue: vol21Value !== null ? `${vol21Value.toFixed(1)}%` : 'N/A',
            observationWindow: '21 Trading Days (~1 Month)',
            observationsCount: vol21Returns.length,
            requiredObservations: 15,
            dataQuality: vol21Returns.length >= 15 ? 'sufficient' : 'insufficient',
            isTriggered: vol21Triggered,
            severity: vol21Value && vol21Value >= 60.0 ? 'critical' : vol21Triggered ? 'warning' : 'low',
            formula: 'Annualized rolling standard deviation: σ * sqrt(252)',
            explanation: 'Measures short-term annualized dispersion of daily closing prices around the mean.',
            limitations: 'Backward-looking empirical standard deviation; does not account for overnight gapping risk.',
        };
        if (vol21Triggered) {
            triggeredConditions.push({
                category: 'volatility_spike',
                severity: vol21Measurement.severity,
                title: 'Elevated Short-Term Volatility',
                measurement: `${vol21Value?.toFixed(1)}% annualized volatility`,
                evidence: `21-day annualized volatility reached ${vol21Value?.toFixed(1)}%, exceeding the 45.0% elevated risk threshold.`,
                observationWindow: '21 Trading Days (~1 Month)',
                thresholdApplied: '>= 45.0% Annualized',
            });
        }

        // 63-Day Volatility
        const vol63Returns = returns.slice(Math.max(0, returns.length - 63));
        const vol63Value = this.calculateAnnualizedVolatility(vol63Returns);
        const vol63Measurement: RiskIndicatorMeasurement<number> = {
            indicatorName: '63-Day Historical Volatility',
            value: vol63Value,
            displayValue: vol63Value !== null ? `${vol63Value.toFixed(1)}%` : 'N/A',
            observationWindow: '63 Trading Days (~1 Quarter)',
            observationsCount: vol63Returns.length,
            requiredObservations: 45,
            dataQuality: vol63Returns.length >= 45 ? 'sufficient' : 'insufficient',
            isTriggered: vol63Value !== null && vol63Value >= 40.0,
            severity: vol63Value && vol63Value >= 55.0 ? 'critical' : vol63Value && vol63Value >= 40.0 ? 'warning' : 'low',
            formula: 'Quarterly annualized standard deviation: σ * sqrt(252)',
            explanation: 'Intermediate baseline volatility tracking 1-quarter market price variance.',
            limitations: 'Blends older market regimes with recent volatility.',
        };

        // 2. 95% Daily VaR
        const varReturns = returns.slice(Math.max(0, returns.length - 63));
        const var95Value = this.calculateHistoricalVaR95(varReturns);
        const var95Triggered = var95Value !== null && var95Value >= 3.5; // Estimated 1-day loss >= 3.5%
        const var95Measurement: RiskIndicatorMeasurement<number> = {
            indicatorName: '95% Daily Value at Risk (VaR)',
            value: var95Value,
            displayValue: var95Value !== null ? `${var95Value.toFixed(2)}%` : 'N/A',
            observationWindow: `${varReturns.length} Trading Days`,
            observationsCount: varReturns.length,
            requiredObservations: 40,
            dataQuality: varReturns.length >= 40 ? 'sufficient' : 'marginal',
            isTriggered: var95Triggered,
            severity: var95Value && var95Value >= 5.0 ? 'critical' : var95Triggered ? 'warning' : 'low',
            formula: 'Empirical 5th percentile of historical daily percentage returns',
            explanation: 'Historically, on 95% of trading days, daily loss did not exceed this percentage.',
            limitations: 'IMPORTANT: VaR is a threshold quantile, NOT the maximum possible loss. Tail losses can exceed this value.',
        };
        if (var95Triggered) {
            triggeredConditions.push({
                category: 'var_exceedance',
                severity: var95Measurement.severity,
                title: 'High Historical Value at Risk',
                measurement: `${var95Value?.toFixed(2)}% 1-day VaR (95%)`,
                evidence: `Historical 95% daily Value at Risk is ${var95Value?.toFixed(2)}%, indicating heightened tail loss frequency.`,
                observationWindow: `${varReturns.length} Trading Days`,
                thresholdApplied: '>= 3.5% Daily Loss Threshold',
            });
        }

        // 3. 95% CVaR
        const cvar95Value = var95Value !== null ? this.calculateHistoricalCVaR95(varReturns, var95Value) : null;
        const cvar95Measurement: RiskIndicatorMeasurement<number> = {
            indicatorName: '95% Conditional Value at Risk (CVaR)',
            value: cvar95Value,
            displayValue: cvar95Value !== null ? `${cvar95Value.toFixed(2)}%` : 'N/A',
            observationWindow: `${varReturns.length} Trading Days`,
            observationsCount: varReturns.length,
            requiredObservations: 40,
            dataQuality: varReturns.length >= 40 ? 'sufficient' : 'marginal',
            isTriggered: cvar95Value !== null && cvar95Value >= 5.0,
            severity: cvar95Value && cvar95Value >= 7.0 ? 'critical' : cvar95Value && cvar95Value >= 5.0 ? 'warning' : 'low',
            formula: 'Average of historical returns that fell in the adverse 5% tail',
            explanation: 'Expected average loss on days when the 95% VaR loss threshold was breached.',
            limitations: 'Black swan events or structural corporate shocks can produce losses beyond historical tail averages.',
        };

        // 4. Maximum Drawdown
        const maxDrawdownValue = this.calculateMaximumDrawdown(
            historicalCloses,
            hasLiveQuote ? currentPrice : undefined
        );
        const drawdownTriggered = maxDrawdownValue !== null && maxDrawdownValue >= 20.0; // 20%+ drawdown
        const maxDrawdownMeasurement: RiskIndicatorMeasurement<number> = {
            indicatorName: 'Maximum Drawdown',
            value: maxDrawdownValue,
            displayValue: maxDrawdownValue !== null ? `-${maxDrawdownValue.toFixed(1)}%` : 'N/A',
            observationWindow: `${historicalCloses.length} Trading Days`,
            observationsCount: historicalCloses.length,
            requiredObservations: 20,
            dataQuality: 'sufficient',
            isTriggered: drawdownTriggered,
            severity: maxDrawdownValue && maxDrawdownValue >= 35.0 ? 'critical' : drawdownTriggered ? 'warning' : 'low',
            formula: 'Largest percentage drop from a peak to a subsequent trough',
            explanation: 'Quantifies the historical maximum capital decline experienced over the observed period.',
            limitations: 'Measures past price drops; does not predict time required to recover or future drawdowns.',
        };
        if (drawdownTriggered) {
            triggeredConditions.push({
                category: 'drawdown',
                severity: maxDrawdownMeasurement.severity,
                title: 'Substantial Historical Drawdown',
                measurement: `-${maxDrawdownValue?.toFixed(1)}% peak-to-trough`,
                evidence: `Peak-to-trough decline over the observation window reached -${maxDrawdownValue?.toFixed(1)}%.`,
                observationWindow: `${historicalCloses.length} Trading Days`,
                thresholdApplied: '>= 20.0% Drawdown',
            });
        }

        // 5. Moving Average Breakdown (200-day SMA, falling back to 50-day if 120-199 candles)
        const maPeriod = historicalCloses.length >= 200 ? 200 : historicalCloses.length >= 50 ? 50 : 0;
        const maData = maPeriod > 0 ? this.evaluateMovingAverageBreakdown(historicalCloses, maPeriod, currentPrice) : null;
        const maTriggered = maData !== null && maData.isBreakdown && maData.percentBelow >= 2.0;
        const maMeasurement: RiskIndicatorMeasurement<MovingAverageBreakdownData> = {
            indicatorName: `${maPeriod || 200}-Day Moving Average Breakdown`,
            value: maData,
            displayValue: maData
                ? maData.isBreakdown
                    ? `-${maData.percentBelow.toFixed(1)}% below ${maPeriod}d SMA ($${maData.movingAveragePrice})`
                    : `+${(-maData.percentBelow).toFixed(1)}% above ${maPeriod}d SMA ($${maData.movingAveragePrice})`
                : 'Insufficient observations',
            observationWindow: `${maPeriod || 200} Trading Days`,
            observationsCount: historicalCloses.length,
            requiredObservations: maPeriod || 200,
            dataQuality: maPeriod >= 200 ? 'sufficient' : maPeriod >= 50 ? 'marginal' : 'insufficient',
            isTriggered: maTriggered,
            severity: maData && maData.percentBelow >= 6.0 ? 'critical' : maTriggered ? 'warning' : 'low',
            formula: 'P_current < SimpleMovingAverage(P, N)',
            explanation: 'Identifies technical loss of intermediate-to-long term trend support.',
            limitations: 'Lagging indicator; whipsaws can occur during choppy horizontal consolidation.',
        };
        if (maTriggered && maData) {
            triggeredConditions.push({
                category: 'ma_breakdown',
                severity: maMeasurement.severity,
                title: `${maPeriod}-Day Moving Average Breakdown`,
                measurement: `${maData.percentBelow.toFixed(1)}% below ${maPeriod}d SMA`,
                evidence: `Price of $${currentPrice.toFixed(2)} broke down below the ${maPeriod}-day SMA ($${maData.movingAveragePrice}).`,
                observationWindow: `${maPeriod} Trading Days`,
                thresholdApplied: `>= 2.0% Below ${maPeriod}d SMA`,
            });
        }

        // 6. Proximity to Historical Low (252 days / 52 weeks)
        const lowData = this.evaluateProximityToLow(historicalCloses, 252, currentPrice);
        const lowTriggered = lowData !== null && lowData.isNearLow;
        const lowMeasurement: RiskIndicatorMeasurement<ProximityToLowData> = {
            indicatorName: 'Proximity to 52-Week Low',
            value: lowData,
            displayValue: lowData
                ? `+${lowData.percentAboveLow.toFixed(1)}% above low ($${lowData.historicalLowPrice})`
                : 'Insufficient observations',
            observationWindow: `${lowData?.periodDays || 0} Trading Days`,
            observationsCount: historicalCloses.length,
            requiredObservations: 60,
            dataQuality: historicalCloses.length >= 180 ? 'sufficient' : historicalCloses.length >= 60 ? 'marginal' : 'insufficient',
            isTriggered: lowTriggered,
            severity: lowData && lowData.percentAboveLow <= 1.5 ? 'warning' : lowTriggered ? 'advisory' : 'low',
            formula: '((P_current - P_min) / P_min) * 100 <= 5.0%',
            explanation: 'Measures proximity to the lowest price recorded across the trailing observation window.',
            limitations: 'A stock near historical lows can form a consolidation floor or continue downward in a structural bear trend.',
        };
        if (lowTriggered && lowData) {
            triggeredConditions.push({
                category: 'historical_low',
                severity: lowMeasurement.severity,
                title: 'Trading Near Historical Low',
                measurement: `+${lowData.percentAboveLow.toFixed(1)}% above low ($${lowData.historicalLowPrice})`,
                evidence: `Current price of $${currentPrice.toFixed(2)} is within ${lowData.percentAboveLow.toFixed(1)}% of its ${lowData.periodDays}-day low ($${lowData.historicalLowPrice}).`,
                observationWindow: `${lowData.periodDays} Trading Days`,
                thresholdApplied: '<= 5.0% Above Trailing Low',
            });
        }

        // 7. Volatility Expansion (21d vs 63d)
        const volExpData = this.evaluateVolatilityExpansion(returns, 21, 63);
        const volExpTriggered = volExpData !== null && volExpData.isExpanding;
        const volExpMeasurement: RiskIndicatorMeasurement<VolatilityExpansionData> = {
            indicatorName: 'Volatility Expansion Ratio',
            value: volExpData,
            displayValue: volExpData
                ? `${volExpData.expansionRatio.toFixed(2)}× baseline (${volExpData.shortTermVolatility}% vs ${volExpData.baselineVolatility}%)`
                : 'Insufficient observations',
            observationWindow: '21d Short-Term vs 63d Baseline',
            observationsCount: returns.length,
            requiredObservations: 63,
            dataQuality: returns.length >= 63 ? 'sufficient' : 'insufficient',
            isTriggered: volExpTriggered,
            severity: volExpData && volExpData.expansionRatio >= 1.6 ? 'critical' : volExpTriggered ? 'warning' : 'low',
            formula: 'σ_21d / σ_63d >= 1.30',
            explanation: 'Compares short-term volatility to quarterly baseline to spot sudden risk acceleration.',
            limitations: 'Expansion can accompany both aggressive upward rallies and steep downward sell-offs.',
        };
        if (volExpTriggered && volExpData) {
            triggeredConditions.push({
                category: 'volatility_spike',
                severity: volExpMeasurement.severity,
                title: 'Accelerating Volatility Expansion',
                measurement: `${volExpData.expansionRatio.toFixed(2)}× quarterly baseline`,
                evidence: `Short-term 21-day volatility (${volExpData.shortTermVolatility}%) expanded to ${volExpData.expansionRatio.toFixed(2)}× the 63-day baseline (${volExpData.baselineVolatility}%).`,
                observationWindow: '21d vs 63d Baseline',
                thresholdApplied: '>= 1.30× Baseline Ratio',
            });
        }

        // Overall Severity Evaluation
        let overallRiskSeverity: RiskSeverity = 'low';
        if (triggeredConditions.some((c) => c.severity === 'critical') || triggeredConditions.filter((c) => c.severity === 'warning').length >= 2) {
            overallRiskSeverity = 'critical';
        } else if (triggeredConditions.some((c) => c.severity === 'warning')) {
            overallRiskSeverity = 'warning';
        } else if (triggeredConditions.some((c) => c.severity === 'advisory')) {
            overallRiskSeverity = 'advisory';
        }

        // Experimental Heuristic Composite Score (0-100, explicitly documented as NOT a probability)
        let score = 10;
        if (vol21Value) score += Math.min(25, (vol21Value / 50) * 15);
        if (var95Value) score += Math.min(25, (var95Value / 4) * 15);
        if (maxDrawdownValue) score += Math.min(20, (maxDrawdownValue / 30) * 15);
        if (maData?.isBreakdown) score += Math.min(20, 10 + maData.percentBelow * 2);
        if (volExpData?.isExpanding) score += Math.min(15, (volExpData.expansionRatio - 1) * 20);
        if (lowData?.isNearLow) score += 10;
        const experimentalRiskScore = Math.min(100, Math.max(5, Math.round(score)));

        const scoreInterpretation =
            experimentalRiskScore >= 75
                ? 'Critical downside volatility and technical breakdown signals active.'
                : experimentalRiskScore >= 50
                ? 'Elevated historical risk metrics exceeding standard baseline bands.'
                : experimentalRiskScore >= 30
                ? 'Moderate market fluctuations observed within acceptable intermediate limits.'
                : 'Controlled historical variance and constructive price structure.';

        const summary =
            triggeredConditions.length > 0
                ? `${cleanSymbol} triggered ${triggeredConditions.length} quantitative downside-risk condition(s): ${triggeredConditions.map((c) => c.title).join(', ')}.`
                : `${cleanSymbol} is operating within normal historical volatility and trend parameters. No downside alert conditions triggered.`;

        const methodologyNotes = [
            'All calculations use verified historical closing prices from Finnhub.',
            'Values are mathematical empirical observations, NOT statistical probability forecasts.',
            'Value at Risk (VaR) is a 95% threshold quantile, not the maximum possible loss.',
            'Past performance and volatility patterns do not guarantee future market behavior.',
        ];

        const overallDataQuality: RiskDataQuality =
            historicalCloses.length >= 200 ? 'sufficient' : historicalCloses.length >= 60 ? 'marginal' : 'insufficient';

        return {
            symbol: cleanSymbol,
            companyName,
            currentPrice: Number(currentPrice.toFixed(2)),
            assessmentTimestamp: now,
            dataFreshness: `${historicalCloses.length} verified trading day candles analyzed${hasLiveQuote ? ' (evaluated with live quote)' : ''}`,
            dataWindow: {
                fromTimestamp: fromTs,
                toTimestamp: toTs,
                totalCandles: candles.close.length,
                validPriceObservations: historicalCloses.length,
            },
            overallDataQuality,
            historicalVolatility21d: vol21Measurement,
            historicalVolatility63d: vol63Measurement,
            historicalVaR95: var95Measurement,
            historicalCVaR95: cvar95Measurement,
            maximumDrawdown: maxDrawdownMeasurement,
            movingAverageBreakdown: maMeasurement,
            proximityToLow: lowMeasurement,
            volatilityExpansion: volExpMeasurement,
            triggeredConditions,
            overallRiskSeverity,
            experimentalRiskScore,
            scoreInterpretation,
            summary,
            methodologyNotes,
            calculationVersion,
            referencePriceType,
            dataAsOfTimestamp: validTimestamps[validTimestamps.length - 1] ? validTimestamps[validTimestamps.length - 1] * 1000 : now,
        };
    }

    private static createMissingIndicator<T>(
        name: string,
        window: string,
        required: number,
        reason: string
    ): RiskIndicatorMeasurement<T> {
        return {
            indicatorName: name,
            value: null,
            displayValue: 'Unavailable',
            observationWindow: window,
            observationsCount: 0,
            requiredObservations: required,
            dataQuality: 'insufficient',
            isTriggered: false,
            severity: 'low',
            formula: 'Mathematical definition preserved; calculation skipped due to missing data',
            explanation: `Indicator calculation skipped because ${reason}.`,
            limitations: 'Never treated as zero risk or zero price.',
        };
    }
}
