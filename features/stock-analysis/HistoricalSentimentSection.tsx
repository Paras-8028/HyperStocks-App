'use client';

import React, { useState, useEffect } from 'react';
import {
    EvaluationIntegrityStatus,
    HistoricalSentimentEvaluationReport,
    HorizonReturnStats,
    SentimentDataProvenance,
} from '@/types/news';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    BarChart3,
    Calendar,
    ChevronDown,
    Clock,
    Database,
    ExternalLink,
    HelpCircle,
    Info,
    RefreshCw,
    Shield,
    ShieldAlert,
    ShieldCheck,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';

export interface HistoricalSentimentSectionProps {
    symbol: string;
    className?: string;
}

export function HistoricalSentimentSection({
    symbol,
    className = '',
}: HistoricalSentimentSectionProps) {
    const [report, setReport] = useState<HistoricalSentimentEvaluationReport | null>(null);
    const [collectorStats, setCollectorStats] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedHorizon, setSelectedHorizon] = useState<'h1' | 'h5' | 'h20'>('h5');
    const [showMethodology, setShowMethodology] = useState(false);
    const [showPipelineStatus, setShowPipelineStatus] = useState(false);

    const cleanSymbol = symbol.toUpperCase().trim();

    const fetchEvaluation = async () => {
        setLoading(true);
        try {
            const [evalRes, statsRes] = await Promise.all([
                fetch(`/api/news?mode=evaluation&symbol=${cleanSymbol}`),
                fetch(`/api/news?mode=collector_status&symbol=${cleanSymbol}`)
            ]);

            if (evalRes.ok) {
                const json = await evalRes.json();
                if (json.success && json.data) {
                    setReport(json.data);
                }
            }
            if (statsRes.ok) {
                const sJson = await statsRes.json();
                if (sJson.success && sJson.data) {
                    setCollectorStats(sJson.data);
                }
            }
        } catch (err) {
            console.error('Failed to load historical sentiment evaluation:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvaluation();
    }, [cleanSymbol]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3 backdrop-blur animate-pulse">
                <div className="h-4 w-48 bg-gray-800 rounded" />
                <div className="h-20 bg-gray-850/50 rounded-xl" />
            </div>
        );
    }

    const cohorts = report?.sentimentCohorts;
    const status: EvaluationIntegrityStatus = report?.status || 'NO_HISTORICAL_RECORDS';
    const provenance: SentimentDataProvenance = report?.dataProvenance || 'none';

    const renderReturnCell = (val: number | null, isPercent = true) => {
        if (val === null || val === undefined) return <span className="text-gray-500 font-mono">—</span>;
        const isPos = val > 0;
        const isNeg = val < 0;
        return (
            <span
                className={`font-mono font-semibold ${
                    isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-gray-300'
                }`}
            >
                {isPos ? '+' : ''}
                {val.toFixed(2)}
                {isPercent ? '%' : ''}
            </span>
        );
    };

    const renderHorizonStatsRow = (
        label: string,
        stats: HorizonReturnStats | undefined,
        cohortColor: string
    ) => {
        if (!stats) return null;
        return (
            <tr className="border-b border-gray-800/60 hover:bg-gray-850/40 transition-colors">
                <td className="py-2.5 px-3">
                    <span className={`font-bold text-xs uppercase ${cohortColor}`}>{label}</span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-300">{stats.sampleCount}</td>
                <td className="py-2.5 px-3 text-right">{renderReturnCell(stats.meanReturnPercent)}</td>
                <td className="py-2.5 px-3 text-right">{renderReturnCell(stats.medianReturnPercent)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-400">
                    {stats.volatilityPercent !== null ? `${stats.volatilityPercent.toFixed(2)}%` : '—'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-300">
                    {stats.winRatePercent !== null ? `${stats.winRatePercent.toFixed(1)}%` : '—'}
                    {stats.winRate95CI && (
                        <div className="text-[10px] text-gray-500 font-normal">
                            [{stats.winRate95CI.lower}%, {stats.winRate95CI.upper}%]
                        </div>
                    )}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-xs">
                    {stats.meanReturn95CI ? (
                        <span className="text-gray-400">
                            [{stats.meanReturn95CI.lower > 0 ? '+' : ''}
                            {stats.meanReturn95CI.lower}%, {stats.meanReturn95CI.upper > 0 ? '+' : ''}
                            {stats.meanReturn95CI.upper}%]
                        </span>
                    ) : (
                        <span className="text-gray-500">—</span>
                    )}
                </td>
                <td className="py-2.5 px-3 text-right">{renderReturnCell(stats.excessReturnPercent)}</td>
            </tr>
        );
    };

    // Status Banner Renderer (5 Distinct Evaluation Integrity States)
    const renderStatusBanner = () => {
        switch (status) {
            case 'NO_HISTORICAL_RECORDS':
                return (
                    <div className="rounded-xl border border-gray-800 bg-gray-950/80 p-3.5 flex items-start gap-3 text-gray-400">
                        <Database className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <div className="font-semibold text-xs text-gray-300">
                                No Historical Records Available for {cleanSymbol}
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                {report?.dataSufficiencyAssessment ||
                                    'Neither historical stock prices nor point-in-time sentiment records have been ingested for this ticker. Real historical evaluation is not possible without real data.'}
                            </p>
                        </div>
                    </div>
                );

            case 'INSUFFICIENT_OBSERVATIONS':
                return (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-amber-200">
                        <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <div className="font-semibold text-xs text-amber-300">
                                Insufficient Observations (N = {report?.eligibleArticlesWithPrices ?? 0} &lt; 30)
                            </div>
                            <p className="text-[11px] text-amber-200/90 leading-relaxed">
                                {report?.dataSufficiencyAssessment ||
                                    'Sample contains fewer than 30 validated sentiment events matched to completed subsequent trading sessions. No predictive accuracy is claimed on small samples.'}
                            </p>
                        </div>
                    </div>
                );

            case 'INCOMPLETE_PRICE_COVERAGE':
                return (
                    <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3.5 flex items-start gap-3 text-orange-200">
                        <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <div className="font-semibold text-xs text-orange-300">
                                Incomplete Price Coverage Across Horizon
                            </div>
                            <p className="text-[11px] text-orange-200/90 leading-relaxed">
                                {report?.dataSufficiencyAssessment ||
                                    'News events were matched to trading sessions, but subsequent forward price bars are incomplete. Recent events lack full 5-day or 20-day returns.'}
                            </p>
                        </div>
                    </div>
                );

            case 'EVALUATION_COMPLETED_UNCERTAIN':
                return (
                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 flex items-start gap-3 text-purple-200">
                        <Info className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <div className="font-semibold text-xs text-purple-300">
                                Evaluation Completed — Excess Returns Statistically Uncertain
                            </div>
                            <p className="text-[11px] text-purple-200/90 leading-relaxed">
                                {report?.dataSufficiencyAssessment ||
                                    'Evaluation meets the minimum sample threshold (N >= 30), but 95% confidence intervals cross zero. Observed return differences are not statistically distinguishable from random walk.'}
                            </p>
                        </div>
                    </div>
                );

            case 'EVALUATION_COMPLETED_SUFFICIENT_DATA':
                return (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-2.5 text-emerald-200">
                        <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <div className="font-semibold text-xs text-emerald-300">
                                Evaluation Completed With Sufficient Sample ({report?.eligibleArticlesWithPrices ?? 0} Observations)
                            </div>
                            <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                                {report?.dateRange
                                    ? `Evaluated over trading sessions from ${report.dateRange.from} to ${report.dateRange.to}.`
                                    : 'Evaluated across real recorded trading sessions.'}{' '}
                                Note: Past correlation does not guarantee future market predictability.
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={`rounded-2xl border border-gray-800 bg-gray-900/80 p-5 backdrop-blur space-y-4 shadow-xl text-xs ${className}`}>
            {/* Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 text-[#35D6FF]">
                        <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-100">
                                Historical Sentiment vs. Subsequent Price Returns
                            </h3>

                            {/* Integrity Status Badge */}
                            <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                    status === 'EVALUATION_COMPLETED_SUFFICIENT_DATA'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : status === 'EVALUATION_COMPLETED_UNCERTAIN'
                                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                                        : status === 'INCOMPLETE_PRICE_COVERAGE'
                                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                                        : status === 'INSUFFICIENT_OBSERVATIONS'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                        : 'bg-gray-800 border-gray-700 text-gray-400'
                                }`}
                            >
                                {status.replace(/_/g, ' ')}
                            </span>

                            {/* Provenance Badge */}
                            <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider border ${
                                    provenance === 'point_in_time_recorded'
                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                                        : provenance === 'retrospective_inference'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                        : 'bg-gray-800 border-gray-700 text-gray-400'
                                }`}
                                title={report?.provenanceExplanation}
                            >
                                {provenance === 'point_in_time_recorded'
                                    ? 'PROVENANCE: POINT-IN-TIME'
                                    : provenance === 'retrospective_inference'
                                    ? 'PROVENANCE: RETROSPECTIVE'
                                    : 'PROVENANCE: LIVE STREAM'}
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                            Empirical forward returns across 1-day, 5-day, and 20-day trading horizons.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Horizon Filter Tabs */}
                    <div className="inline-flex rounded-lg bg-gray-800/80 p-0.5 border border-gray-700">
                        <button
                            onClick={() => setSelectedHorizon('h1')}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                                selectedHorizon === 'h1'
                                    ? 'bg-[#7C5CFF] text-white shadow'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            1-Day
                        </button>
                        <button
                            onClick={() => setSelectedHorizon('h5')}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                                selectedHorizon === 'h5'
                                    ? 'bg-[#7C5CFF] text-white shadow'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            5-Day
                        </button>
                        <button
                            onClick={() => setSelectedHorizon('h20')}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                                selectedHorizon === 'h20'
                                    ? 'bg-[#7C5CFF] text-white shadow'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            20-Day
                        </button>
                    </div>

                    <button
                        onClick={fetchEvaluation}
                        className="p-1.5 rounded-lg border border-gray-800 bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition"
                        title="Recompute evaluation"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Status Banner */}
            {renderStatusBanner()}

            {/* Overlapping Horizon Warning (Autocorrelation) */}
            {report?.hasOverlappingHorizons && (
                <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3 text-[11px] text-gray-400 flex items-start gap-2.5">
                    <Info className="h-3.5 w-3.5 text-[#35D6FF] flex-shrink-0 mt-0.5" />
                    <div>
                        <strong className="text-gray-300">Autocorrelation Notice: </strong>
                        {report.overlappingHorizonWarning}
                    </div>
                </div>
            )}

            {/* Empirical Returns Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/60">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-gray-800 bg-gray-900/70 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            <th className="py-2.5 px-3">Sentiment Cohort</th>
                            <th className="py-2.5 px-3 text-right">Sample (N)</th>
                            <th className="py-2.5 px-3 text-right">Mean Return</th>
                            <th className="py-2.5 px-3 text-right">Median</th>
                            <th className="py-2.5 px-3 text-right">Volatility (σ)</th>
                            <th className="py-2.5 px-3 text-right">Win Rate (95% CI)</th>
                            <th className="py-2.5 px-3 text-right">Mean 95% CI</th>
                            <th className="py-2.5 px-3 text-right">Excess vs Baseline</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderHorizonStatsRow(
                            'Bullish',
                            cohorts?.bullish?.horizons[selectedHorizon],
                            'text-emerald-400'
                        )}
                        {renderHorizonStatsRow(
                            'Bearish',
                            cohorts?.bearish?.horizons[selectedHorizon],
                            'text-rose-400'
                        )}
                        {renderHorizonStatsRow(
                            'Neutral',
                            cohorts?.neutral?.horizons[selectedHorizon],
                            'text-gray-300'
                        )}
                        {renderHorizonStatsRow(
                            'Mixed',
                            cohorts?.mixed?.horizons[selectedHorizon],
                            'text-purple-300'
                        )}
                    </tbody>
                </table>
            </div>

            {/* Unconditional Baseline & Out-of-Sample Partitioning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Unconditional Baseline Reference */}
                <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-300">
                        <span>Unconditional Historical Baseline</span>
                        <span className="text-[10px] text-gray-500 font-normal">Identical Time Period</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                        <div className="rounded-lg bg-gray-900/60 p-2 border border-gray-800">
                            <div className="text-[10px] text-gray-400 uppercase">1-Day Mean</div>
                            <div className="text-xs font-bold text-gray-200">
                                {renderReturnCell(report?.unconditionalBaseline?.h1Mean ?? null)}
                            </div>
                        </div>
                        <div className="rounded-lg bg-gray-900/60 p-2 border border-gray-800">
                            <div className="text-[10px] text-gray-400 uppercase">5-Day Mean</div>
                            <div className="text-xs font-bold text-gray-200">
                                {renderReturnCell(report?.unconditionalBaseline?.h5Mean ?? null)}
                            </div>
                        </div>
                        <div className="rounded-lg bg-gray-900/60 p-2 border border-gray-800">
                            <div className="text-[10px] text-gray-400 uppercase">20-Day Mean</div>
                            <div className="text-xs font-bold text-gray-200">
                                {renderReturnCell(report?.unconditionalBaseline?.h20Mean ?? null)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* In-Sample vs Out-of-Sample Split */}
                <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-300">
                        <span>Chronological Out-of-Sample Test</span>
                        <span className="text-[10px] text-gray-500 font-normal">70% IS / 30% OOS</span>
                    </div>
                    {report?.inSampleVsOutOfSample ? (
                        <div className="grid grid-cols-2 gap-2 text-center pt-1 font-mono">
                            <div className="rounded-lg bg-gray-900/60 p-2 border border-gray-800 text-left space-y-0.5">
                                <div className="text-[10px] text-gray-400 uppercase">In-Sample Events</div>
                                <div className="text-xs font-bold text-blue-300">
                                    N = {report.inSampleVsOutOfSample.inSampleCount}
                                </div>
                                <div className="text-[9px] text-gray-500 truncate">
                                    {report.inSampleVsOutOfSample.inSampleDateRange.from} → {report.inSampleVsOutOfSample.inSampleDateRange.to}
                                </div>
                            </div>
                            <div className="rounded-lg bg-gray-900/60 p-2 border border-gray-800 text-left space-y-0.5">
                                <div className="text-[10px] text-gray-400 uppercase">OOS 5d Bullish Mean</div>
                                <div className="text-xs font-bold text-emerald-300">
                                    {renderReturnCell(report.inSampleVsOutOfSample.outOfSampleH5MeanBullish)}
                                </div>
                                <div className="text-[9px] text-gray-500 truncate">
                                    OOS 5d Bear: {renderReturnCell(report.inSampleVsOutOfSample.outOfSampleH5MeanBearish)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[11px] text-gray-500 italic pt-2">
                            Partitioning requires at least 10 observations to produce valid in-sample and out-of-sample segments.
                        </p>
                    )}
                </div>
            </div>

            {/* Collector & Pipeline Status Panel */}
            <div className="pt-2 border-t border-gray-800/80">
                <button
                    onClick={() => setShowPipelineStatus(!showPipelineStatus)}
                    className="flex items-center justify-between w-full text-left text-[11px] font-semibold text-gray-400 hover:text-gray-200 transition"
                >
                    <span className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-purple-400" />
                        Automated News & Sentiment Collector Pipeline
                        {collectorStats && (
                            <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
                                {collectorStats.pointInTimeRecords} Point-in-Time Records
                            </span>
                        )}
                    </span>
                    <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${showPipelineStatus ? 'rotate-180' : ''}`}
                    />
                </button>

                {showPipelineStatus && (
                    <div className="mt-2.5 rounded-xl bg-gray-950/70 p-3 border border-gray-800/80 space-y-3 text-[11px] text-gray-400 leading-relaxed">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                            <div className="rounded-lg bg-gray-900/60 p-2 border border-gray-800">
                                <div className="text-[10px] text-gray-500 uppercase">Total Persisted</div>
                                <div className="text-sm font-bold text-gray-100">
                                    {collectorStats?.totalRecords ?? 0}
                                </div>
                                <div className="text-[9px] text-gray-500">
                                    v1 Point-in-Time: {collectorStats?.pointInTimeRecords ?? 0}
                                </div>
                            </div>
                            <div className="rounded-lg bg-gray-900/60 p-2 border border-gray-800">
                                <div className="text-[10px] text-gray-500 uppercase">Syndicated Skipped</div>
                                <div className="text-sm font-bold text-amber-300">
                                    {collectorStats?.syndicatedCopiesSkippedOrFlagged ?? 0}
                                </div>
                                <div className="text-[9px] text-gray-500">
                                    Reassessed (v2+): {collectorStats?.reassessedRecords ?? 0}
                                </div>
                            </div>
                            <div className="rounded-lg bg-gray-900/60 p-2 border border-gray-800">
                                <div className="text-[10px] text-gray-500 uppercase">Tracked Symbols</div>
                                <div className="text-sm font-bold text-[#35D6FF]">
                                    {collectorStats?.uniqueSymbolsCount ?? 0}
                                </div>
                                <div className="text-[9px] text-gray-500 truncate" title={collectorStats?.symbolsTracked?.join(', ')}>
                                    {collectorStats?.symbolsTracked?.slice(0, 5).join(', ') || 'None'}
                                </div>
                            </div>
                            <div className="rounded-lg bg-gray-900/60 p-2 border border-gray-800">
                                <div className="text-[10px] text-gray-500 uppercase">Pipeline Status</div>
                                <div className="text-sm font-bold capitalize flex items-center gap-1.5">
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                            collectorStats?.pipelineStatus?.isRunning
                                                ? 'bg-amber-400 animate-ping'
                                                : collectorStats?.pipelineStatus?.lastRunStatus === 'success'
                                                ? 'bg-emerald-400'
                                                : collectorStats?.pipelineStatus?.lastRunStatus === 'failed'
                                                ? 'bg-rose-400'
                                                : 'bg-gray-400'
                                        }`}
                                    />
                                    <span className="text-xs text-gray-200">
                                        {collectorStats?.pipelineStatus?.isRunning
                                            ? 'Running'
                                            : collectorStats?.pipelineStatus?.lastRunStatus || 'Idle'}
                                    </span>
                                </div>
                                <div className="text-[9px] text-gray-500">
                                    {collectorStats?.pipelineStatus?.lastRunTimestamp
                                        ? new Date(collectorStats.pipelineStatus.lastRunTimestamp).toLocaleTimeString()
                                        : 'No runs yet'}
                                </div>
                            </div>
                        </div>

                        <div className="text-[10px] text-gray-400 space-y-1 pt-1 border-t border-gray-800/60">
                            <div className="flex justify-between items-center text-gray-400">
                                <span>Background Scheduler:</span>
                                <span className="font-mono text-gray-300">Inngest Cron (0 */2 * * 1-5, Every 2h Mon-Fri)</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-400">
                                <span>Publication Range:</span>
                                <span className="font-mono text-gray-300">
                                    {collectorStats?.oldestPublicationDate
                                        ? `${collectorStats.oldestPublicationDate.slice(0, 10)} → ${collectorStats.newestPublicationDate?.slice(0, 10)}`
                                        : 'Awaiting initial collection'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-gray-400">
                                <span>Assessment Timestamps:</span>
                                <span className="font-mono text-gray-300">
                                    {collectorStats?.oldestAssessmentDate
                                        ? `${collectorStats.oldestAssessmentDate.slice(0, 10)} → ${collectorStats.newestAssessmentDate?.slice(0, 10)}`
                                        : 'None recorded'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Methodology Accordion */}
            <div className="pt-2 border-t border-gray-800/80">
                <button
                    onClick={() => setShowMethodology(!showMethodology)}
                    className="flex items-center justify-between w-full text-left text-[11px] font-semibold text-gray-400 hover:text-gray-200 transition"
                >
                    <span className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-[#35D6FF]" />
                        Methodology, Look-Ahead Prevention & Data Governance Disclaimers
                    </span>
                    <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${showMethodology ? 'rotate-180' : ''}`}
                    />
                </button>

                {showMethodology && (
                    <div className="mt-2.5 rounded-xl bg-gray-950/70 p-3 border border-gray-800/80 space-y-2 text-[11px] text-gray-400 leading-relaxed">
                        <ul className="list-disc pl-4 space-y-1">
                            <li>
                                <strong className="text-gray-300">Data Provenance:</strong> Point-in-time sentiment must be recorded at original publication. Retrospective inferences generated after the fact from historical text are never represented as prior investor knowledge.
                            </li>
                            <li>
                                <strong className="text-gray-300">Trading-Session Boundaries:</strong> Articles published after 16:00 ET or during non-trading weekends/holidays are anchored to the next available trading day session close.
                            </li>
                            <li>
                                <strong className="text-gray-300">Deduplication & Coalescing:</strong> Multiple syndicated releases on the same trading day are coalesced to avoid overcounting duplicated wire coverage.
                            </li>
                            <li>
                                <strong className="text-gray-300">Overlapping Horizons:</strong> Overlapping return horizons induce autocorrelation. Nominal N &gt;= 30 is an exploratory threshold, not proof of alpha or future profitability.
                            </li>
                            <li>
                                <strong className="text-gray-300">Zero Look-Ahead Bias:</strong> Historical price lookups are strictly forward-looking from the anchor session close.
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
