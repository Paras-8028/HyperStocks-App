import { HistoricalBarModel, IHistoricalBarDocument } from '@/database/models/historical_bar.model';
import { HistoricalBarInput } from '@/services/backtesting/BacktestEngine';
import {
    EvaluationIntegrityStatus,
    HistoricalSentimentEvaluationReport,
    HorizonReturnStats,
    NewsConfidenceDimensions,
    NewsSentimentClass,
    SentimentClassEvaluation,
    SentimentDataProvenance,
} from '@/types/news';

export interface NewsEventRecord {
    id: string;
    symbol: string;
    headline: string;
    summary?: string;
    source: string;
    url?: string;
    publishedAt: Date | string | number;
    recordedAt?: Date | string | number;
    provenance?: SentimentDataProvenance;
    isRetrospective?: boolean;
    sentiment: NewsSentimentClass;
    confidenceDimensions?: NewsConfidenceDimensions;
    sourceReliabilityScore?: number;
    interpretationConfidenceScore?: number;
    marketDirectionalUncertaintyScore?: number;
}

export interface HistoricalEvaluationOptions {
    deduplicatePerSession?: boolean;
    splitRatio?: number; // In-sample ratio (default 0.7)
    confidenceLevel?: number; // default 0.95
    symbol?: string;
}

export class HistoricalSentimentEvaluator {
    public static readonly VERSION = '2.0.0-phase6';

    /**
     * Evaluates subsequent historical stock returns following timestamped news sentiment events.
     * Evaluates 1-day, 5-day, and 20-day trading sessions.
     * 
     * STRICT RULES:
     * 1. Uses only information available at the assessment timestamp.
     * 2. Respects trading session boundaries (after-hours/weekends anchor to the next trading day).
     * 3. Prevents look-ahead bias: future prices are never used in sentiment or anchor prices.
     * 4. Reports sample counts, mean, median, volatility, 95% CIs, and unconditional baselines.
     * 5. Enforces clear evaluation status (NO_HISTORICAL_RECORDS, INSUFFICIENT_OBSERVATIONS, etc.).
     * 6. Strictly segregates point-in-time recorded sentiment from retrospective inferences.
     * 7. Detects overlapping horizon autocorrelation.
     */
    public static evaluateSentimentReturns(
        events: NewsEventRecord[],
        bars: (HistoricalBarInput | IHistoricalBarDocument)[],
        options: HistoricalEvaluationOptions = {}
    ): HistoricalSentimentEvaluationReport {
        const {
            deduplicatePerSession = true,
            splitRatio = 0.7,
            symbol = events[0]?.symbol?.toUpperCase() || 'MULTI',
        } = options;

        const evaluatedAt = new Date().toISOString();

        // 1. Resolve Data Provenance
        let dataProvenance: SentimentDataProvenance = 'none';
        let provenanceExplanation = 'No historical sentiment records available for evaluation.';

        if (events.length > 0) {
            const hasRecorded = events.some((e) => e.provenance === 'point_in_time_recorded');
            const hasRetrospective = events.some((e) => e.isRetrospective || e.provenance === 'retrospective_inference');

            if (hasRecorded && !hasRetrospective) {
                dataProvenance = 'point_in_time_recorded';
                provenanceExplanation = 'Genuine point-in-time sentiment captured and stored at original article publication time.';
            } else if (hasRetrospective) {
                dataProvenance = 'retrospective_inference';
                provenanceExplanation = 'Retrospective sentiment generated today from older article text. Must NOT be presented as if available to investors at publication time.';
            } else {
                dataProvenance = 'unarchived_live';
                provenanceExplanation = 'Live retrieved news feed evaluated on the fly; not persisted historically at publication.';
            }
        }

        // 2. Audit and clean historical bars
        const cleanedBars = this.cleanAndSortBars(bars);
        if (cleanedBars.length === 0 || events.length === 0) {
            return this.buildReportWithStatus(
                'NO_HISTORICAL_RECORDS',
                dataProvenance,
                provenanceExplanation,
                symbol,
                evaluatedAt,
                events.length,
                0,
                null,
                'No valid historical price bars or news events available in database for evaluation.'
            );
        }

        const barDateKeys = cleanedBars.map((b) => this.toISODateKey(b.timestamp));
        const barDateIndexMap = new Map<string, number>();
        barDateKeys.forEach((d, idx) => barDateIndexMap.set(d, idx));

        // 3. Map news events to actionable trading sessions (session cutoff: 16:00 ET)
        interface MatchedSessionEvent {
            sessionDate: string;
            anchorBarIndex: number;
            sentiment: NewsSentimentClass;
            event: NewsEventRecord;
        }

        const matchedRawEvents: MatchedSessionEvent[] = [];

        for (const ev of events) {
            // Strict point-in-time causality: sentiment cannot be acted upon before it is actually computed.
            // If model assessment occurred after publication (e.g. after hours or next day), the assessment
            // timestamp determines the first eligible trading session.
            const pubMs = new Date(ev.publishedAt).getTime();
            const recMs = ev.recordedAt ? new Date(ev.recordedAt).getTime() : pubMs;
            const effectiveMs = isNaN(recMs) || isNaN(pubMs) ? pubMs : Math.max(pubMs, recMs);

            const { dateKey, isAfterHoursOrWeekend } = this.parseEasternTradingSession(effectiveMs);

            let anchorIdx = -1;

            if (!isAfterHoursOrWeekend && barDateIndexMap.has(dateKey)) {
                // News during regular trading hours on a valid trading day
                anchorIdx = barDateIndexMap.get(dateKey)!;
            } else {
                // After-hours (>= 16:00 ET), weekend, or holiday: actionable at the first trading session strictly after
                for (let i = 0; i < barDateKeys.length; i++) {
                    if (isAfterHoursOrWeekend ? barDateKeys[i] > dateKey : barDateKeys[i] >= dateKey) {
                        anchorIdx = i;
                        break;
                    }
                }
            }

            if (anchorIdx >= 0 && anchorIdx < cleanedBars.length) {
                matchedRawEvents.push({
                    sessionDate: barDateKeys[anchorIdx],
                    anchorBarIndex: anchorIdx,
                    sentiment: ev.sentiment,
                    event: ev,
                });
            }
        }

        if (matchedRawEvents.length === 0) {
            return this.buildReportWithStatus(
                'NO_HISTORICAL_RECORDS',
                dataProvenance,
                provenanceExplanation,
                symbol,
                evaluatedAt,
                events.length,
                0,
                null,
                'No news events could be mapped to subsequent historical trading sessions.'
            );
        }

        // 4. Deduplicate / coalesce multiple news events anchoring to the exact same trading session
        const sessionEvents: MatchedSessionEvent[] = [];

        if (deduplicatePerSession) {
            const bySession = new Map<string, MatchedSessionEvent[]>();
            for (const me of matchedRawEvents) {
                const key = `${me.event.symbol.toUpperCase()}_${me.sessionDate}`;
                if (!bySession.has(key)) bySession.set(key, []);
                bySession.get(key)!.push(me);
            }

            for (const [_, group] of bySession.entries()) {
                if (group.length === 1) {
                    sessionEvents.push(group[0]);
                } else {
                    // Check for conflicting sentiment on same trading session
                    const sentiments = new Set(group.map((g) => g.sentiment));
                    let coalescedSentiment: NewsSentimentClass = group[0].sentiment;

                    if (sentiments.has('mixed') || (sentiments.has('bullish') && sentiments.has('bearish'))) {
                        coalescedSentiment = 'mixed';
                    } else if (sentiments.has('bullish')) {
                        coalescedSentiment = 'bullish';
                    } else if (sentiments.has('bearish')) {
                        coalescedSentiment = 'bearish';
                    } else {
                        coalescedSentiment = 'neutral';
                    }

                    sessionEvents.push({
                        sessionDate: group[0].sessionDate,
                        anchorBarIndex: group[0].anchorBarIndex,
                        sentiment: coalescedSentiment,
                        event: group[0].event,
                    });
                }
            }
        } else {
            sessionEvents.push(...matchedRawEvents);
        }

        // Sort chronologically by anchor bar index
        sessionEvents.sort((a, b) => a.anchorBarIndex - b.anchorBarIndex);

        const firstDate = sessionEvents[0]?.sessionDate;
        const lastDate = sessionEvents[sessionEvents.length - 1]?.sessionDate;
        const dateRange = firstDate && lastDate ? { from: firstDate, to: lastDate } : null;

        // 5. Overlapping Return Horizon Detection
        const hasOverlappingHorizons = sessionEvents.some((ev, idx) => {
            if (idx === 0) return false;
            return ev.anchorBarIndex - sessionEvents[idx - 1].anchorBarIndex < 5;
        });

        // Compute effective independent degrees of freedom
        const computeEffectiveDegreesOfFreedom = (minSpacingBars: number): number => {
            if (sessionEvents.length === 0) return 0;
            let count = 1;
            let lastIdx = sessionEvents[0].anchorBarIndex;
            for (let i = 1; i < sessionEvents.length; i++) {
                if (sessionEvents[i].anchorBarIndex - lastIdx >= minSpacingBars) {
                    count++;
                    lastIdx = sessionEvents[i].anchorBarIndex;
                }
            }
            return count;
        };

        const effectiveObservations = {
            h1: computeEffectiveDegreesOfFreedom(1),
            h5: computeEffectiveDegreesOfFreedom(5),
            h20: computeEffectiveDegreesOfFreedom(20),
        };

        const overlappingHorizonWarning = hasOverlappingHorizons
            ? `Overlapping forward return windows (subsequent news events separated by < 5 trading sessions) induce serial autocorrelation. Effective independent degrees of freedom: H5=${effectiveObservations.h5}, H20=${effectiveObservations.h20} (Nominal N=${sessionEvents.length}).`
            : undefined;

        // 6. Calculate Unconditional Baseline Returns over the identical historical period
        const minAnchorIdx = Math.min(...sessionEvents.map((e) => e.anchorBarIndex));
        const maxAnchorIdx = Math.max(...sessionEvents.map((e) => e.anchorBarIndex));

        const baselineReturnsH1: number[] = [];
        const baselineReturnsH5: number[] = [];
        const baselineReturnsH20: number[] = [];

        for (let i = minAnchorIdx; i <= maxAnchorIdx; i++) {
            const p0 = cleanedBars[i].close;
            if (p0 <= 0) continue;

            if (i + 1 < cleanedBars.length && cleanedBars[i + 1].close > 0) {
                baselineReturnsH1.push(((cleanedBars[i + 1].close - p0) / p0) * 100);
            }
            if (i + 5 < cleanedBars.length && cleanedBars[i + 5].close > 0) {
                baselineReturnsH5.push(((cleanedBars[i + 5].close - p0) / p0) * 100);
            }
            if (i + 20 < cleanedBars.length && cleanedBars[i + 20].close > 0) {
                baselineReturnsH20.push(((cleanedBars[i + 20].close - p0) / p0) * 100);
            }
        }

        const unconditionalBaseline = {
            h1Mean: this.mean(baselineReturnsH1),
            h5Mean: this.mean(baselineReturnsH5),
            h20Mean: this.mean(baselineReturnsH20),
        };

        // 7. Compute forward returns for each observation
        interface ObservationReturn {
            sentiment: NewsSentimentClass;
            anchorIdx: number;
            r1: number | null;
            r5: number | null;
            r20: number | null;
        }

        const observations: ObservationReturn[] = [];

        for (const se of sessionEvents) {
            const p0 = cleanedBars[se.anchorBarIndex].close;
            if (p0 <= 0) continue;

            const r1 = se.anchorBarIndex + 1 < cleanedBars.length && cleanedBars[se.anchorBarIndex + 1].close > 0
                ? ((cleanedBars[se.anchorBarIndex + 1].close - p0) / p0) * 100
                : null;

            const r5 = se.anchorBarIndex + 5 < cleanedBars.length && cleanedBars[se.anchorBarIndex + 5].close > 0
                ? ((cleanedBars[se.anchorBarIndex + 5].close - p0) / p0) * 100
                : null;

            const r20 = se.anchorBarIndex + 20 < cleanedBars.length && cleanedBars[se.anchorBarIndex + 20].close > 0
                ? ((cleanedBars[se.anchorBarIndex + 20].close - p0) / p0) * 100
                : null;

            observations.push({
                sentiment: se.sentiment,
                anchorIdx: se.anchorBarIndex,
                r1,
                r5,
                r20,
            });
        }

        const buildCohortStats = (cohort: NewsSentimentClass): SentimentClassEvaluation => {
            const cohortObs = observations.filter((o) => o.sentiment === cohort);
            const r1Values = cohortObs.map((o) => o.r1).filter((v): v is number => v !== null);
            const r5Values = cohortObs.map((o) => o.r5).filter((v): v is number => v !== null);
            const r20Values = cohortObs.map((o) => o.r20).filter((v): v is number => v !== null);

            return {
                sentiment: cohort,
                totalEvents: cohortObs.length,
                horizons: {
                    h1: this.computeHorizonStats(1, r1Values, unconditionalBaseline.h1Mean),
                    h5: this.computeHorizonStats(5, r5Values, unconditionalBaseline.h5Mean),
                    h20: this.computeHorizonStats(20, r20Values, unconditionalBaseline.h20Mean),
                },
            };
        };

        const sentimentCohorts = {
            bullish: buildCohortStats('bullish'),
            bearish: buildCohortStats('bearish'),
            neutral: buildCohortStats('neutral'),
            mixed: buildCohortStats('mixed'),
        };

        // 8. Out-of-sample partitioning (Chronological 70% / 30% split)
        let inSampleVsOutOfSample: HistoricalSentimentEvaluationReport['inSampleVsOutOfSample'];

        if (observations.length >= 10) {
            const splitIndex = Math.floor(observations.length * Math.max(0.5, Math.min(0.9, splitRatio)));
            const inSampleObs = observations.slice(0, splitIndex);
            const outOfSampleObs = observations.slice(splitIndex);

            const isDateFirst = cleanedBars[inSampleObs[0].anchorIdx]?.timestamp;
            const isDateLast = cleanedBars[inSampleObs[inSampleObs.length - 1].anchorIdx]?.timestamp;
            const oosDateFirst = cleanedBars[outOfSampleObs[0].anchorIdx]?.timestamp;
            const oosDateLast = cleanedBars[outOfSampleObs[outOfSampleObs.length - 1].anchorIdx]?.timestamp;

            const oosBullishH5 = outOfSampleObs
                .filter((o) => o.sentiment === 'bullish')
                .map((o) => o.r5)
                .filter((v): v is number => v !== null);

            const oosBearishH5 = outOfSampleObs
                .filter((o) => o.sentiment === 'bearish')
                .map((o) => o.r5)
                .filter((v): v is number => v !== null);

            inSampleVsOutOfSample = {
                inSampleCount: inSampleObs.length,
                outOfSampleCount: outOfSampleObs.length,
                inSampleDateRange: {
                    from: isDateFirst ? this.toISODateKey(isDateFirst) : '',
                    to: isDateLast ? this.toISODateKey(isDateLast) : '',
                },
                outOfSampleDateRange: {
                    from: oosDateFirst ? this.toISODateKey(oosDateFirst) : '',
                    to: oosDateLast ? this.toISODateKey(oosDateLast) : '',
                },
                outOfSampleH5MeanBullish: this.mean(oosBullishH5),
                outOfSampleH5MeanBearish: this.mean(oosBearishH5),
            };
        }

        // 9. Data Sufficiency & Status Classification
        const totalEligibleH5 =
            sentimentCohorts.bullish.horizons.h5.sampleCount +
            sentimentCohorts.bearish.horizons.h5.sampleCount +
            sentimentCohorts.neutral.horizons.h5.sampleCount +
            sentimentCohorts.mixed.horizons.h5.sampleCount;

        const isStatisticallyReliable = totalEligibleH5 >= 30;

        let status: EvaluationIntegrityStatus;
        let dataSufficiencyAssessment: string;

        if (observations.length < 30) {
            status = 'INSUFFICIENT_OBSERVATIONS';
            dataSufficiencyAssessment = `Insufficient historical sample size (N = ${totalEligibleH5} < 30). Empirical sample is too small to draw statistically reliable conclusions or claim predictive out-of-sample performance.`;
        } else if (totalEligibleH5 < observations.length * 0.7) {
            status = 'INCOMPLETE_PRICE_COVERAGE';
            dataSufficiencyAssessment = `Incomplete subsequent price coverage: Only ${totalEligibleH5} of ${observations.length} matched events have completed 5-day trading sessions. Subsequent bars missing for recent events.`;
        } else {
            // Check confidence interval uncertainty
            const bullishH5 = sentimentCohorts.bullish.horizons.h5;
            const bearishH5 = sentimentCohorts.bearish.horizons.h5;
            const isBullishUncertain = !bullishH5.meanReturn95CI || (bullishH5.meanReturn95CI.lower <= 0 && bullishH5.meanReturn95CI.upper >= 0);
            const isBearishUncertain = !bearishH5.meanReturn95CI || (bearishH5.meanReturn95CI.lower <= 0 && bearishH5.meanReturn95CI.upper >= 0);

            if (isBullishUncertain && isBearishUncertain) {
                status = 'EVALUATION_COMPLETED_UNCERTAIN';
                dataSufficiencyAssessment = `Empirical sample size (N = ${totalEligibleH5} >= 30) meets minimum statistical evaluation threshold, but excess returns are statistically uncertain: 95% confidence intervals cross zero. Note: Sample correlation does not prove predictive ability.`;
            } else {
                status = 'EVALUATION_COMPLETED_SUFFICIENT_DATA';
                dataSufficiencyAssessment = `Empirical sample size (N = ${totalEligibleH5} >= 30) meets minimum statistical evaluation threshold. Note: Historical return correlation does not constitute a guaranteed price prediction.`;
            }
        }

        const methodologyNotes = [
            'Entry price convention: Closing price of the anchor trading day (or next session if published after 16:00 ET or on a non-trading day).',
            'Exit price convention: Closing price of the trading session exactly 1, 5, or 20 completed sessions later.',
            'News published after 16:00 ET, on weekends, or during US market holidays anchors to the subsequent trading day to eliminate look-ahead bias.',
            'Multiple news releases on the same session are coalesced to prevent wire syndication redundancy from skewing samples.',
            'Overlapping horizons induce serial autocorrelation; nominal N exceeds independent statistical degrees of freedom.',
            'Heuristic sentiment classifications are empirical snapshots and do not promise future price moves.',
        ];

        return {
            symbol,
            evaluatedAt,
            status,
            dataProvenance,
            provenanceExplanation,
            totalArticlesEvaluated: events.length,
            eligibleArticlesWithPrices: observations.length,
            dateRange,
            hasOverlappingHorizons,
            overlappingHorizonWarning,
            effectiveObservations,
            sentimentCohorts,
            unconditionalBaseline,
            inSampleVsOutOfSample,
            isStatisticallyReliable,
            dataSufficiencyAssessment,
            methodologyNotes,
        };
    }

    /**
     * Loads historical bars from MongoDB and evaluates real sentiment logs for a symbol.
     */
    public static async evaluateFromDatabase(
        symbol: string,
        events: NewsEventRecord[] = [],
        options: HistoricalEvaluationOptions = {}
    ): Promise<HistoricalSentimentEvaluationReport> {
        const cleanSymbol = symbol.trim().toUpperCase();
        try {
            const { connectToDatabase } = await import('@/database/mongoose');
            await connectToDatabase();
        } catch (dbErr) {
            console.warn('HistoricalSentimentEvaluator: Database connection error:', dbErr);
        }

        const bars = await HistoricalBarModel.find({ symbol: cleanSymbol })
            .sort({ timestamp: 1 })
            .lean();

        // Check if point-in-time sentiment logs exist in MongoDB
        let effectiveEvents = events;
        if (effectiveEvents.length === 0) {
            try {
                const { HistoricalSentimentLogModel } = await import('@/database/models/historical_sentiment_log.model');
                const logs = await HistoricalSentimentLogModel.find({ symbol: cleanSymbol, version: 1 })
                    .sort({ publishedAt: 1 })
                    .lean();

                if (logs.length > 0) {
                    effectiveEvents = logs.map((l) => ({
                        id: l.articleId,
                        symbol: l.symbol,
                        headline: l.headline,
                        summary: l.summary,
                        source: l.source,
                        url: l.url,
                        publishedAt: l.publishedAt,
                        recordedAt: l.recordedAt,
                        provenance: l.provenance,
                        isRetrospective: l.isRetrospective,
                        sentiment: l.sentiment,
                        sourceReliabilityScore: l.sourceReliabilityScore,
                        interpretationConfidenceScore: l.interpretationConfidenceScore,
                        marketDirectionalUncertaintyScore: l.marketDirectionalUncertaintyScore,
                    }));
                }
            } catch (err) {
                console.warn('HistoricalSentimentEvaluator: Failed to query HistoricalSentimentLogModel:', err);
            }
        }

        return this.evaluateSentimentReturns(effectiveEvents, bars as any[], {
            ...options,
            symbol: cleanSymbol,
        });
    }

    // ==========================================
    // MATHEMATICAL & STATISTICAL HELPERS
    // ==========================================

    private static computeHorizonStats(
        horizon: 1 | 5 | 20,
        returns: number[],
        baselineMean: number | null
    ): HorizonReturnStats {
        const sampleCount = returns.length;
        if (sampleCount === 0) {
            return {
                horizonDays: horizon,
                sampleCount: 0,
                meanReturnPercent: null,
                medianReturnPercent: null,
                volatilityPercent: null,
                winRatePercent: null,
                meanReturn95CI: null,
                winRate95CI: null,
                unconditionalBaselineMeanPercent: baselineMean,
                excessReturnPercent: null,
            };
        }

        const meanVal = this.mean(returns)!;
        const medianVal = this.median(returns)!;
        const volVal = this.standardDeviation(returns);

        // Win Rate (% of returns > 0)
        const winCount = returns.filter((r) => r > 0).length;
        const winRate = Number(((winCount / sampleCount) * 100).toFixed(2));
        const winRate95CI = this.calculateWilsonCI(winCount, sampleCount);

        // 95% Confidence Interval for the Mean Return
        // SE = s / sqrt(n)
        let meanReturn95CI: { lower: number; upper: number } | null = null;
        if (volVal !== null && sampleCount >= 2) {
            const se = volVal / Math.sqrt(sampleCount);
            // Approximation: t_crit ~ 1.96 for n >= 30, t ~ 2.2 for small n
            const tCrit = sampleCount >= 30 ? 1.96 : 2.262;
            meanReturn95CI = {
                lower: Number((meanVal - tCrit * se).toFixed(2)),
                upper: Number((meanVal + tCrit * se).toFixed(2)),
            };
        }

        const excessReturn = baselineMean !== null
            ? Number((meanVal - baselineMean).toFixed(2))
            : null;

        return {
            horizonDays: horizon,
            sampleCount,
            meanReturnPercent: meanVal,
            medianReturnPercent: medianVal,
            volatilityPercent: volVal,
            winRatePercent: winRate,
            meanReturn95CI,
            winRate95CI,
            unconditionalBaselineMeanPercent: baselineMean,
            excessReturnPercent: excessReturn,
        };
    }

    public static parseEasternTradingSession(dateInput: Date | string | number): {
        dateKey: string;
        isAfterHoursOrWeekend: boolean;
    } {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) {
            return { dateKey: '1970-01-01', isAfterHoursOrWeekend: false };
        }

        // Format to US Eastern parts
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            weekday: 'short',
        }).formatToParts(d);

        let year = '1970';
        let month = '01';
        let day = '01';
        let hour = 12;
        let minute = 0;
        let weekday = 'Mon';

        for (const p of parts) {
            if (p.type === 'year') year = p.value;
            if (p.type === 'month') month = p.value;
            if (p.type === 'day') day = p.value;
            if (p.type === 'hour') hour = parseInt(p.value, 10);
            if (p.type === 'minute') minute = parseInt(p.value, 10);
            if (p.type === 'weekday') weekday = p.value;
        }

        const dateKey = `${year}-${month}-${day}`;
        const isWeekend = weekday === 'Sat' || weekday === 'Sun';
        // Market closes at 16:00 ET. Any news at or after 16:00 ET anchors to next day
        const isAfterHours = hour >= 16;

        return {
            dateKey,
            isAfterHoursOrWeekend: isWeekend || isAfterHours,
        };
    }

    private static calculateWilsonCI(
        successes: number,
        trials: number,
        confidenceLevel = 0.95
    ): { lower: number; upper: number } | null {
        if (trials <= 0) return null;
        const z = confidenceLevel === 0.99 ? 2.576 : confidenceLevel === 0.90 ? 1.645 : 1.96;
        const p = successes / trials;
        const z2 = z * z;
        const denom = 1 + z2 / trials;
        const center = (p + z2 / (2 * trials)) / denom;
        const margin = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denom;

        return {
            lower: Number((Math.max(0, center - margin) * 100).toFixed(2)),
            upper: Number((Math.min(1, center + margin) * 100).toFixed(2)),
        };
    }

    private static mean(values: number[]): number | null {
        if (!values || values.length === 0) return null;
        const sum = values.reduce((acc, v) => acc + v, 0);
        return Number((sum / values.length).toFixed(2));
    }

    private static median(values: number[]): number | null {
        if (!values || values.length === 0) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const med = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        return Number(med.toFixed(2));
    }

    private static standardDeviation(values: number[]): number | null {
        if (!values || values.length < 2) return null;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const sumSq = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0);
        const variance = sumSq / (values.length - 1);
        return Number(Math.sqrt(variance).toFixed(2));
    }

    private static cleanAndSortBars(
        bars: (HistoricalBarInput | IHistoricalBarDocument)[]
    ): HistoricalBarInput[] {
        if (!bars || bars.length === 0) return [];

        const seenDates = new Set<string>();
        const valid: HistoricalBarInput[] = [];

        for (const b of bars) {
            const ts = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
            if (isNaN(ts.getTime())) continue;

            const dateKey = this.toISODateKey(ts);
            if (seenDates.has(dateKey)) continue;
            seenDates.add(dateKey);

            if (b.open <= 0 || b.high <= 0 || b.low <= 0 || b.close <= 0) continue;
            if (b.high < b.low) continue;

            valid.push({
                symbol: b.symbol,
                timestamp: ts,
                open: b.open,
                high: b.high,
                low: b.low,
                close: b.close,
                volume: b.volume || 0,
            });
        }

        return valid.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    private static toISODateKey(d: Date | string | number): string {
        const dateObj = d instanceof Date ? d : new Date(d);
        if (isNaN(dateObj.getTime())) return '1970-01-01';
        return dateObj.toISOString().split('T')[0];
    }

    private static buildReportWithStatus(
        status: EvaluationIntegrityStatus,
        dataProvenance: SentimentDataProvenance,
        provenanceExplanation: string,
        symbol: string,
        evaluatedAt: string,
        totalEvents: number,
        eligibleEvents: number,
        dateRange: { from: string; to: string } | null,
        reason: string
    ): HistoricalSentimentEvaluationReport {
        const emptyCohort = (s: NewsSentimentClass): SentimentClassEvaluation => ({
            sentiment: s,
            totalEvents: 0,
            horizons: {
                h1: this.computeHorizonStats(1, [], null),
                h5: this.computeHorizonStats(5, [], null),
                h20: this.computeHorizonStats(20, [], null),
            },
        });

        return {
            symbol,
            evaluatedAt,
            status,
            dataProvenance,
            provenanceExplanation,
            totalArticlesEvaluated: totalEvents,
            eligibleArticlesWithPrices: eligibleEvents,
            dateRange,
            hasOverlappingHorizons: false,
            sentimentCohorts: {
                bullish: emptyCohort('bullish'),
                bearish: emptyCohort('bearish'),
                neutral: emptyCohort('neutral'),
                mixed: emptyCohort('mixed'),
            },
            unconditionalBaseline: {
                h1Mean: null,
                h5Mean: null,
                h20Mean: null,
            },
            isStatisticallyReliable: false,
            dataSufficiencyAssessment: reason,
            methodologyNotes: [
                'Historical return evaluation requires at least 30 matched observations with subsequent trading sessions to reach statistical reliability.',
                'Do not claim predictive accuracy when empirical sample size is zero or insufficient.',
                'Point-in-time sentiment must be recorded at article publication; retrospective inferences are tracked with explicit provenance.',
            ],
        };
    }
}
