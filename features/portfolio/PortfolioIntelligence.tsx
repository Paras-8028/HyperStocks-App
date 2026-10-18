'use client';

import React, { useState, useEffect } from 'react';
import { AIPortfolioReport, PortfolioPosition } from '@/types/portfolio';
import { MetricCardSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import {
    Activity,
    AlertOctagon,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    BarChart2,
    Briefcase,
    CheckCircle2,
    Compass,
    DollarSign,
    Info,
    Layers,
    Lightbulb,
    PieChart,
    Plus,
    RefreshCw,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Target,
    Trash2,
    TrendingDown,
    TrendingUp,
    X,
    Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export function PortfolioIntelligence() {
    const [report, setReport] = useState<AIPortfolioReport | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'performance' | 'insights' | 'holdings'>('overview');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Add position modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState('');
    const [costBasis, setCostBasis] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchPortfolio = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/portfolio');
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            const data = await res.json();
            if (data.success && data.data) {
                setReport(data.data);
            } else {
                throw new Error(data.error || 'Failed to analyze portfolio');
            }
        } catch (err: any) {
            console.error('fetchPortfolio error:', err);
            setError(err?.message || 'Unable to load portfolio intelligence');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
    }, []);

    const handleAddPosition = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symbol.trim() || !shares || !costBasis) {
            toast.error('Please enter symbol, shares, and cost basis');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol.toUpperCase().trim(),
                    shares: parseFloat(shares),
                    costBasis: parseFloat(costBasis),
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(`Added ${symbol.toUpperCase()} to portfolio`);
                setShowAddModal(false);
                setSymbol('');
                setShares('');
                setCostBasis('');
                fetchPortfolio(true);
            } else {
                toast.error(data.error || 'Failed to add position');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save position');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePosition = async (id: string, sym: string) => {
        try {
            const res = await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success(`Removed position ${sym}`);
                fetchPortfolio(true);
            } else {
                toast.error(data.error || 'Failed to delete position');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to remove position');
        }
    };

    if (loading && !report) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                </div>
            </div>
        );
    }

    if (error && !report) {
        return (
            <ErrorState
                title="Portfolio Analytics Unavailable"
                message={error}
                onRetry={() => fetchPortfolio(false)}
            />
        );
    }

    if (!report) return null;

    const { deterministic, aiIntelligence } = report;
    const { summary, sectorExposures, concentration, attribution, riskMetrics, alerts, positions } = deterministic;

    const totalGainPositive = summary.totalUnrealizedGainLoss >= 0;
    const dailyGainPositive = summary.dailyGainLoss >= 0;

    return (
        <div className="space-y-8">
            {/* Header with Title, AI Engine Tag & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 md:p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-gray-900 via-gray-900/95 to-emerald-950/20 backdrop-blur shadow-xl">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                        <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                        AI Portfolio Intelligence Engine
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400 font-mono">Gemini 3.6 Flash</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-100">
                        Portfolio Performance & Risk Audit
                    </h1>
                    <p className="text-xs text-gray-400 max-w-xl">
                        Deterministic financial calculations paired with institutional qualitative AI synthesis and automated exposure monitors.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-gray-950 text-xs font-bold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        Add Position
                    </button>

                    <button
                        onClick={() => fetchPortfolio(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-700/80 bg-gray-800/80 text-xs font-medium text-gray-200 hover:bg-gray-750 transition disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
                        {refreshing ? 'Recalculating...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Top 4 Hero Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Value */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 backdrop-blur shadow-lg space-y-1">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                        <span>Total Portfolio Value</span>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-gray-100">
                        ${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-gray-500">
                        Cost Basis: <span className="text-gray-300 font-mono">${summary.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* 2. Today's Performance */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 backdrop-blur shadow-lg space-y-1">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                        <span>Today&apos;s Movement</span>
                        {dailyGainPositive ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                        ) : (
                            <ArrowDownRight className="h-4 w-4 text-rose-400" />
                        )}
                    </div>
                    <div className={`text-2xl font-extrabold font-mono ${dailyGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {dailyGainPositive ? '+' : ''}${summary.dailyGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-[11px] font-mono font-medium ${dailyGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {dailyGainPositive ? '+' : ''}{summary.dailyGainLossPercent.toFixed(2)}% today
                    </div>
                </div>

                {/* 3. All-Time Return */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 backdrop-blur shadow-lg space-y-1">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                        <span>All-Time Unrealized Return</span>
                        {totalGainPositive ? (
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-rose-400" />
                        )}
                    </div>
                    <div className={`text-2xl font-extrabold font-mono ${totalGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalGainPositive ? '+' : ''}${summary.totalUnrealizedGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-[11px] font-mono font-medium ${totalGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalGainPositive ? '+' : ''}{summary.totalGainLossPercent.toFixed(2)}% net P&L
                    </div>
                </div>

                {/* 4. Risk & Diversification Score */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 backdrop-blur shadow-lg space-y-1">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                        <span>Diversification & Beta</span>
                        <Shield className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-gray-100 flex items-center gap-2">
                        β {riskMetrics.weightedBeta}
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400 font-sans">
                            ({riskMetrics.volatilityLevel})
                        </span>
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">
                        {concentration.diversificationLevel}
                    </div>
                </div>
            </div>

            {/* AI Executive Summary Banner */}
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-6 backdrop-blur shadow-xl space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <Compass className="h-4 w-4" />
                        AI Executive Portfolio Synthesis
                    </div>
                    <span className="text-[11px] text-emerald-300 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        {aiIntelligence.confidenceScore}% Conviction
                    </span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed font-normal">
                    {aiIntelligence.executiveSummary}
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-gray-900/90 border border-gray-800 backdrop-blur">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                        activeTab === 'overview'
                            ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                >
                    <PieChart className="h-3.5 w-3.5" />
                    Allocation & Sectors
                </button>
                <button
                    onClick={() => setActiveTab('risk')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                        activeTab === 'risk'
                            ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Risk & Concentration
                </button>
                <button
                    onClick={() => setActiveTab('performance')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                        activeTab === 'performance'
                            ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                >
                    <BarChart2 className="h-3.5 w-3.5" />
                    Performance Attribution
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                        activeTab === 'insights'
                            ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                >
                    <Lightbulb className="h-3.5 w-3.5" />
                    Insights & Suggestions
                </button>
                <button
                    onClick={() => setActiveTab('holdings')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                        activeTab === 'holdings'
                            ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                >
                    <Briefcase className="h-3.5 w-3.5" />
                    Holdings & Alerts ({alerts.length})
                </button>
            </div>

            {/* TAB 1: Overview & Sector Exposure */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sector Exposure List */}
                    <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur shadow-xl space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                                <Layers className="h-4 w-4 text-emerald-400" />
                                Sector Exposure vs S&P 500 Benchmark
                            </h2>
                            <span className="text-xs text-gray-400">
                                {sectorExposures.length} Active Sectors
                            </span>
                        </div>

                        <div className="space-y-4">
                            {sectorExposures.map((sec) => (
                                <div key={sec.sector} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-200">{sec.sector}</span>
                                            <span className="text-gray-500 font-mono">
                                                ${sec.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-emerald-400">
                                                {sec.percent.toFixed(1)}%
                                            </span>
                                            <span
                                                className={`text-[11px] font-mono ${
                                                    sec.benchmarkDelta >= 0 ? 'text-emerald-400' : 'text-gray-400'
                                                }`}
                                            >
                                                {sec.benchmarkDelta >= 0 ? '+' : ''}
                                                {sec.benchmarkDelta.toFixed(1)}% vs S&P
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, sec.percent)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Performer & Asset Concentration summary */}
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur shadow-xl space-y-6">
                        <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2 border-b border-gray-800 pb-3">
                            <Target className="h-4 w-4 text-emerald-400" />
                            Asset Allocation Profile
                        </h2>

                        <div className="space-y-4 text-xs">
                            <div className="p-4 rounded-xl bg-gray-850/60 border border-gray-800 space-y-1">
                                <div className="text-gray-400">Largest Holding:</div>
                                <div className="text-lg font-bold font-mono text-emerald-400">
                                    ${concentration.topStock.symbol}{' '}
                                    <span className="text-xs text-gray-300 font-normal">
                                        ({concentration.topStock.percent.toFixed(1)}% weight)
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-gray-850/60 border border-gray-800 space-y-1">
                                <div className="text-gray-400">Top 3 Holdings Weight:</div>
                                <div className="text-lg font-bold font-mono text-gray-100">
                                    {concentration.top3Percent.toFixed(1)}%
                                </div>
                                <div className="text-[11px] text-gray-500">
                                    Target threshold: &lt; 60% for healthy diversification
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-gray-850/60 border border-gray-800 space-y-1">
                                <div className="text-gray-400">Best Performer:</div>
                                <div className="text-sm font-bold text-emerald-400 font-mono">
                                    ${summary.topPerformer?.symbol || 'N/A'}{' '}
                                    <span className="font-normal text-xs text-emerald-300">
                                        (+{summary.topPerformer?.gainPercent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Portfolio Risk Analysis */}
            {activeTab === 'risk' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. Concentration Risk */}
                        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur shadow-xl space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                                <ShieldAlert className="h-4 w-4" />
                                Concentration Risk
                            </div>
                            <div className="text-3xl font-extrabold font-mono text-gray-100">
                                {riskMetrics.concentrationRiskScore}/100
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {concentration.isConcentrated
                                    ? `Elevated risk: ${concentration.topStock.symbol} and top holdings represent a high portion of capital.`
                                    : 'Well balanced: capital is appropriately spread across individual equities.'}
                            </p>
                        </div>

                        {/* 2. Beta & Volatility */}
                        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur shadow-xl space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                                <Activity className="h-4 w-4" />
                                Portfolio Beta & Volatility
                            </div>
                            <div className="text-3xl font-extrabold font-mono text-gray-100">
                                β {riskMetrics.weightedBeta}
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {riskMetrics.marketExposureRisk}
                            </p>
                        </div>

                        {/* 3. Diversification Health */}
                        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur shadow-xl space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                <ShieldCheck className="h-4 w-4" />
                                Herfindahl Index (HHI)
                            </div>
                            <div className="text-3xl font-extrabold font-mono text-gray-100">
                                {concentration.hhiIndex.toFixed(0)}
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Classification: <span className="font-bold text-emerald-400">{concentration.diversificationLevel}</span> (Scores &lt; 1500 represent standard institutional diversification).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: Performance Attribution */}
            {activeTab === 'performance' && (
                <div className="space-y-6">
                    {/* Qualitative AI Performance Drivers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/15 p-6 backdrop-blur shadow-lg space-y-2">
                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                What Contributed to Gains
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {aiIntelligence.performanceExplanation.gainsDriver}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-rose-500/20 bg-rose-950/15 p-6 backdrop-blur shadow-lg space-y-2">
                            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" />
                                What Caused Drag or Losses
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {aiIntelligence.performanceExplanation.lossesDriver}
                            </p>
                        </div>
                    </div>

                    {/* Attribution Data: Top Contributors & Bottom Detractors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Top Contributors */}
                        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur space-y-4">
                            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                <ArrowUpRight className="h-4 w-4" />
                                Top P&L Contributors
                            </h3>
                            <div className="space-y-3 text-xs">
                                {attribution.topContributors.map((c) => (
                                    <div
                                        key={c.symbol}
                                        className="flex items-center justify-between p-3 rounded-xl bg-gray-850/60 border border-gray-800 font-mono"
                                    >
                                        <span className="font-bold text-gray-100">${c.symbol}</span>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-400">
                                                +${c.dollarContribution.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="text-[11px] text-gray-400">
                                                +{c.percentReturn.toFixed(1)}% ROI
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Detractors */}
                        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur space-y-4">
                            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                                <ArrowDownRight className="h-4 w-4" />
                                Performance Detractors
                            </h3>
                            <div className="space-y-3 text-xs">
                                {attribution.bottomDetractors.length > 0 ? (
                                    attribution.bottomDetractors.map((d) => (
                                        <div
                                            key={d.symbol}
                                            className="flex items-center justify-between p-3 rounded-xl bg-gray-850/60 border border-gray-800 font-mono"
                                        >
                                            <span className="font-bold text-gray-100">${d.symbol}</span>
                                            <div className="text-right">
                                                <div className="font-bold text-rose-400">
                                                    -${Math.abs(d.dollarContribution).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                </div>
                                                <div className="text-[11px] text-gray-400">
                                                    {d.percentReturn.toFixed(1)}% ROI
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-500 italic">
                                        No negative return holdings in current portfolio
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: Insights & AI Recommendations */}
            {activeTab === 'insights' && (
                <div className="space-y-6">
                    {/* 4 Core Factual Insights */}
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur shadow-xl space-y-4">
                        <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-emerald-400" />
                            Key Portfolio Insights
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {aiIntelligence.insights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl bg-gray-850/60 border border-gray-800 text-gray-200 leading-relaxed flex items-start gap-2.5"
                                >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{insight}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Educational AI Suggestions */}
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-6 backdrop-blur shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                AI Strategic Recommendations
                            </h3>
                            <span className="text-[11px] text-gray-400 italic">
                                Educational perspectives
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {aiIntelligence.recommendations.map((rec, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl bg-gray-900/90 border border-emerald-500/20 space-y-2 shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-gray-100">{rec.title}</div>
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                            {rec.actionType}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 leading-relaxed">{rec.suggestion}</p>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 text-[11px] text-gray-500 italic flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            {aiIntelligence.disclaimer}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: Active Holdings & Alerts */}
            {activeTab === 'holdings' && (
                <div className="space-y-6">
                    {/* Active Portfolio Alerts Banners */}
                    {alerts.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Active Portfolio Alerts ({alerts.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`p-4 rounded-xl border backdrop-blur space-y-1.5 ${
                                            alert.severity === 'critical'
                                                ? 'bg-rose-950/25 border-rose-500/30 text-rose-300'
                                                : alert.severity === 'warning'
                                                ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                                                : 'bg-blue-950/20 border-blue-500/30 text-blue-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between font-bold">
                                            <span>{alert.title}</span>
                                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">
                                                {alert.type}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 text-[11px] leading-relaxed">
                                            {alert.message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Holdings Table */}
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/80 overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-emerald-400" />
                                Managed Portfolio Holdings ({positions.length})
                            </h3>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Position
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-850 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                                    <tr>
                                        <th className="py-3 px-4">Asset</th>
                                        <th className="py-3 px-4">Sector</th>
                                        <th className="py-3 px-4 text-right">Shares</th>
                                        <th className="py-3 px-4 text-right">Cost Basis</th>
                                        <th className="py-3 px-4 text-right">Live Price</th>
                                        <th className="py-3 px-4 text-right">Market Value</th>
                                        <th className="py-3 px-4 text-right">Unrealized P&L</th>
                                        <th className="py-3 px-4 text-right">Weight</th>
                                        <th className="py-3 px-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 font-mono">
                                    {positions.map((p) => {
                                        const pnlPositive = (p.unrealizedGainLoss ?? 0) >= 0;
                                        return (
                                            <tr key={p.id} className="hover:bg-gray-850/40 transition">
                                                <td className="py-3 px-4 font-bold text-gray-100">
                                                    <Link
                                                        href={`/stocks/${p.symbol}`}
                                                        className="hover:text-emerald-400 transition"
                                                    >
                                                        ${p.symbol}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-4 text-gray-400 font-sans">{p.sector}</td>
                                                <td className="py-3 px-4 text-right text-gray-300">{p.shares}</td>
                                                <td className="py-3 px-4 text-right text-gray-300">
                                                    ${p.costBasis.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-right text-gray-100 font-bold">
                                                    ${p.currentPrice?.toFixed(2) ?? p.costBasis.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-right text-gray-100 font-bold">
                                                    ${p.marketValue?.toFixed(2) ?? '0.00'}
                                                </td>
                                                <td className={`py-3 px-4 text-right font-bold ${pnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {pnlPositive ? '+' : ''}${p.unrealizedGainLoss?.toFixed(2) ?? '0.00'}
                                                    <div className="text-[10px] font-normal">
                                                        ({pnlPositive ? '+' : ''}{p.unrealizedGainLossPercent?.toFixed(1) ?? '0'}%)
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right text-gray-300">
                                                    {p.allocationPercent?.toFixed(1) ?? '0'}%
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => handleDeletePosition(p.id, p.symbol)}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                                        title="Delete position"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Position Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl space-y-4 text-gray-100">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <Plus className="h-4 w-4 text-emerald-400" />
                                Add Portfolio Position
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddPosition} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-gray-300">Stock Symbol (e.g. AAPL, NVDA)</label>
                                <input
                                    type="text"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                    placeholder="AAPL"
                                    required
                                    className="w-full rounded-xl border border-gray-800 bg-gray-850 px-3.5 py-2.5 text-sm font-mono text-gray-100 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-bold text-gray-300">Number of Shares</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={shares}
                                        onChange={(e) => setShares(e.target.value)}
                                        placeholder="10"
                                        required
                                        className="w-full rounded-xl border border-gray-800 bg-gray-850 px-3.5 py-2.5 text-sm font-mono text-gray-100 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-gray-300">Average Cost Basis ($)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={costBasis}
                                        onChange={(e) => setCostBasis(e.target.value)}
                                        placeholder="180.50"
                                        required
                                        className="w-full rounded-xl border border-gray-800 bg-gray-850 px-3.5 py-2.5 text-sm font-mono text-gray-100 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-xl bg-emerald-500 text-gray-950 font-bold text-xs hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Adding...' : 'Confirm Position'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
