'use client';

import React, { useState, useEffect } from 'react';
import { AlertEntity, CreateAlertInput } from '@/types/alerts';
import { Bell, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export interface AlertIntelligenceManagerProps {
    symbol?: string;
    className?: string;
}

export function AlertIntelligenceManager({
    symbol,
    className = '',
}: AlertIntelligenceManagerProps) {
    const [alerts, setAlerts] = useState<AlertEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [targetPrice, setTargetPrice] = useState('');
    const [condition, setCondition] = useState<'above' | 'below'>('above');
    const [targetSymbol, setTargetSymbol] = useState(symbol || '');

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const url = symbol ? `/api/alerts?symbol=${symbol}` : '/api/alerts';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setAlerts(data.data || []);
                }
            }
        } catch (err) {
            console.error('Failed to load alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAlerts();
    }, [symbol]);

    const handleCreateAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        const sym = (symbol || targetSymbol).toUpperCase().trim();
        const price = parseFloat(targetPrice);

        if (!sym || isNaN(price) || price <= 0) {
            toast.error('Please specify a valid symbol and price target');
            return;
        }

        try {
            const res = await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: sym,
                    targetPrice: price,
                    condition,
                } as CreateAlertInput),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(`Alert set for ${sym} at $${price}`);
                setTargetPrice('');
                loadAlerts();
            } else {
                toast.error(data.error || 'Failed to create alert');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Error creating alert');
        }
    };

    const handleDeleteAlert = async (id: string) => {
        try {
            const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success('Alert removed');
                loadAlerts();
            } else {
                toast.error(data.error || 'Failed to remove alert');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Error deleting alert');
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <form
                onSubmit={handleCreateAlert}
                className="flex flex-wrap items-center gap-2 p-3 bg-gray-900/60 rounded-xl border border-gray-800 backdrop-blur"
            >
                {!symbol && (
                    <input
                        value={targetSymbol}
                        onChange={(e) => setTargetSymbol(e.target.value.toUpperCase())}
                        placeholder="SYMBOL"
                        className="w-24 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs text-gray-100 uppercase"
                        required
                    />
                )}

                <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
                    className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs text-gray-200"
                >
                    <option value="above">Price Rises Above (≥)</option>
                    <option value="below">Price Drops Below (≤)</option>
                </select>

                <input
                    type="number"
                    step="any"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Target Price ($)"
                    className="flex-1 min-w-[120px] rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs text-gray-100"
                    required
                />

                <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-gray-950 hover:bg-emerald-400 transition"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Set Alert
                </button>
            </form>

            {alerts.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                    No price alerts set. Create an alert above to get notified on threshold crossings.
                </div>
            ) : (
                <div className="space-y-2">
                    {alerts.map((a) => (
                        <div
                            key={a.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-gray-900/60 text-xs backdrop-blur"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                                        a.status === 'triggered'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-gray-800 text-gray-400 border-gray-700'
                                    }`}
                                >
                                    {a.status === 'triggered' ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <Bell className="h-4 w-4" />
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-100">
                                        {a.symbol}{' '}
                                        <span
                                            className={
                                                a.condition === 'above' ? 'text-emerald-400' : 'text-rose-400'
                                            }
                                        >
                                            {a.condition === 'above' ? '≥' : '≤'} ${a.targetPrice.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        Status:{' '}
                                        <span
                                            className={
                                                a.status === 'triggered' ? 'text-emerald-400 font-semibold' : 'text-gray-400'
                                            }
                                        >
                                            {a.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDeleteAlert(a.id)}
                                className="text-gray-500 hover:text-rose-400 p-1.5 transition"
                                title="Delete alert"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
