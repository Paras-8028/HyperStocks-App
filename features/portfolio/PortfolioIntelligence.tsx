'use client';

import React, { useState, useEffect } from 'react';
import { PortfolioPosition, PortfolioSummary } from '@/types/portfolio';
import { PortfolioRiskAudit } from '@/types/ai';
import { EmptyState } from '@/components/common/EmptyState';
import { MetricCardSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import {
    Briefcase,
    DollarSign,
    Plus,
    ShieldCheck,
    Sparkles,
    Trash2,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export function PortfolioIntelligence() {
    const [positions, setPositions] = useState<PortfolioPosition[]>([]);
    const [summary, setSummary] = useState<PortfolioSummary | null>(null);
    const [riskAudit, setRiskAudit] = useState<PortfolioRiskAudit | null>(null);
    const [loading, setLoading] = useState(true);
    const [auditing, setAuditing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState('');
    const [costBasis, setCostBasis] = useState('');

    const loadPortfolio = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/portfolio');
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            if (data.success) {
                setPositions(data.data.positions || []);
                setSummary(data.data.summary || null);
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            console.error('loadPortfolio error:', err);
            setError(err?.message || 'Failed to load portfolio');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPortfolio();
    }, []);

    const handleAddPosition = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symbol || !shares || !costBasis) {
            toast.error('Please complete all position fields');
            return;
        }

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
                toast.success(`Position ${symbol.toUpperCase()} added`);
                setShowAddModal(false);
                setSymbol('');
                setShares('');
                setCostBasis('');
                loadPortfolio();
            } else {
                toast.error(data.error || 'Failed to add position');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save position');
        }
    };

    const handleDeletePosition = async (id: string, sym: string) => {
        try {
            const res = await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success(`Position ${sym} deleted`);
                loadPortfolio();
            } else {
                toast.error(data.error || 'Failed to delete position');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to remove position');
        }
    };

    const runAIRiskAudit = async () => {
        if (positions.length === 0) {
            toast.error('Add positions to your portfolio before requesting an AI audit');
            return;
        }
        setAuditing(true);
        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'portfolio_audit',
                    positions,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setRiskAudit(data.data);
                toast.success('AI Risk Audit complete');
            } else {
                toast.error(data.error || 'Failed to complete audit');
            }
        } catch (err: any) {
            toast.error(err?.message || 'AI audit error');
        } finally {
            setAuditing(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorState message={error} onRetry={loadPortfolio} />;
    }

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-emerald-400" />
                        Portfolio Intelligence
                    </h2>
                    <p className="text-xs text-gray-400">
                        Live P&L tracking, sector weights, and automated quantitative risk analysis
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    {positions.length > 0 && (
                        <button
                            onClick={runAIRiskAudit}
                            disabled={auditing}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition disabled:opacity-50"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                            {auditing ? 'Auditing...' : 'Run AI Risk Audit'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-gray-950 hover:bg-emerald-400 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Add Holding
                    </button>
                </div>
            </div>

            {/* Metrics cards */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1 backdrop-blur">
                        <div className="text-xs text-gray-400">Total Portfolio Value</div>
                        <div className="text-xl font-bold text-gray-100">
                            ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-gray-500">
                            Cost Basis: ${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1 backdrop-blur">
                        <div className="text-xs text-gray-400">Unrealized P&L</div>
                        <div
                            className={`text-xl font-bold flex items-center gap-1 ${
                                summary.totalUnrealizedGainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                        >
                            {summary.totalUnrealizedGainLoss >= 0 ? (
                                <TrendingUp className="h-4 w-4" />
                            ) : (
                                <TrendingDown className="h-4 w-4" />
                            )}
                            ${Math.abs(summary.totalUnrealizedGainLoss).toFixed(2)} (
                            {summary.totalGainLossPercent.toFixed(2)}%)
                        </div>
                        <div className="text-[11px] text-gray-500">Positions: {summary.positionCount}</div>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1 backdrop-blur">
                        <div className="text-xs text-gray-400">Top Performer</div>
                        <div className="text-base font-bold text-emerald-400">
                            {summary.topPerformer
                                ? `${summary.topPerformer.symbol} (+${summary.topPerformer.gainPercent.toFixed(1)}%)`
                                : 'N/A'}
                        </div>
                        <div className="text-[11px] text-gray-500">
                            Laggard:{' '}
                            {summary.worstPerformer
                                ? `${summary.worstPerformer.symbol} (${summary.worstPerformer.lossPercent.toFixed(1)}%)`
                                : 'N/A'}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Risk Audit Results */}
            {riskAudit && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/15 p-6 backdrop-blur space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                            <ShieldCheck className="h-4 w-4" />
                            Gemini Portfolio Risk Assessment
                        </div>
                        <div className="text-xs text-gray-400">
                            Risk Score: <span className="font-bold text-gray-200">{riskAudit.overallRiskScore}/10</span> |{' '}
                            Diversification: <span className="font-bold text-gray-200">{riskAudit.diversificationScore}/10</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{riskAudit.summary}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-gray-900/60 p-3 border border-gray-800">
                            <div className="font-semibold text-rose-400 mb-1.5">Concentration & Sector Risks</div>
                            <ul className="space-y-1 text-gray-300">
                                {riskAudit.concentrationRisks.map((r, i) => (
                                    <li key={i}>• {r}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-xl bg-gray-900/60 p-3 border border-gray-800">
                            <div className="font-semibold text-emerald-400 mb-1.5">Actionable Rebalancing Steps</div>
                            <ul className="space-y-1 text-gray-300">
                                {riskAudit.actionableSuggestions.map((s, i) => (
                                    <li key={i}>→ {s}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Holdings Table */}
            {positions.length === 0 ? (
                <EmptyState
                    title="Your Portfolio is Empty"
                    description="Track your stock holdings, calculate live cost-basis returns, and trigger institutional AI risk audits."
                    actionLabel="Add Your First Position"
                    onAction={() => setShowAddModal(true)}
                    icon={Briefcase}
                />
            ) : (
                <div className="rounded-2xl border border-gray-800 bg-gray-900/80 overflow-hidden backdrop-blur">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-300">
                            <thead className="bg-gray-850/80 text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-800">
                                <tr>
                                    <th className="py-3 px-4">Asset</th>
                                    <th className="py-3 px-4">Shares</th>
                                    <th className="py-3 px-4">Cost Basis</th>
                                    <th className="py-3 px-4">Live Price</th>
                                    <th className="py-3 px-4">Market Value</th>
                                    <th className="py-3 px-4">P&L</th>
                                    <th className="py-3 px-4">Weight</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/60">
                                {positions.map((p) => {
                                    const gain = p.unrealizedGainLoss ?? 0;
                                    const gainPct = p.unrealizedGainLossPercent ?? 0;
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-850/40 transition">
                                            <td className="py-3.5 px-4 font-bold text-gray-100">{p.symbol}</td>
                                            <td className="py-3.5 px-4">{p.shares}</td>
                                            <td className="py-3.5 px-4">${p.costBasis.toFixed(2)}</td>
                                            <td className="py-3.5 px-4">${p.currentPrice?.toFixed(2) ?? '—'}</td>
                                            <td className="py-3.5 px-4 font-medium">
                                                ${p.marketValue?.toFixed(2) ?? '—'}
                                            </td>
                                            <td
                                                className={`py-3.5 px-4 font-semibold ${
                                                    gain >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                                }`}
                                            >
                                                {gain >= 0 ? '+' : ''}${gain.toFixed(2)} ({gainPct.toFixed(2)}%)
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {p.allocationPercent ? `${p.allocationPercent.toFixed(1)}%` : '—'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => handleDeletePosition(p.id, p.symbol)}
                                                    className="text-gray-500 hover:text-rose-400 transition"
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
            )}

            {/* Add Position Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <h3 className="text-base font-semibold text-gray-100">Add Portfolio Position</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-200 text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAddPosition} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-gray-400 mb-1">Stock Ticker Symbol</label>
                                <input
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                    placeholder="e.g. AAPL, NVDA, MSFT"
                                    className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3.5 py-2 text-gray-100 uppercase"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 mb-1">Shares Count</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={shares}
                                        onChange={(e) => setShares(e.target.value)}
                                        placeholder="e.g. 15"
                                        className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3.5 py-2 text-gray-100"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1">Cost Basis Per Share ($)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={costBasis}
                                        onChange={(e) => setCostBasis(e.target.value)}
                                        placeholder="e.g. 185.50"
                                        className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3.5 py-2 text-gray-100"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-emerald-500 font-bold text-gray-950 hover:bg-emerald-400 transition"
                                >
                                    Save Position
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
