'use client';

import React, { useState, useEffect } from 'react';
import {
    SmartAlertItem,
    SmartAlertCategory,
    SmartAlertSeverity,
    AlertNotificationPreferences,
    DEFAULT_ALERT_PREFERENCES,
} from '@/types/alerts';
import {
    Bell,
    Check,
    CheckCheck,
    ChevronRight,
    ExternalLink,
    Filter,
    Flame,
    Moon,
    RefreshCw,
    SlidersHorizontal,
    Sparkles,
    TrendingUp,
    Volume2,
    Activity,
    Newspaper,
    Calendar,
    ShieldAlert,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const CATEGORY_META: Record<
    SmartAlertCategory,
    { label: string; icon: any; color: string; bg: string }
> = {
    price: {
        label: 'Price Targets',
        icon: TrendingUp,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    percentage_movement: {
        label: 'Movements',
        icon: Flame,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
    },
    volume: {
        label: 'Volume Spikes',
        icon: Volume2,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    technical_signal: {
        label: 'Technicals',
        icon: Activity,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
    },
    news: {
        label: 'News Impact',
        icon: Newspaper,
        color: 'text-teal-400',
        bg: 'bg-teal-500/10 border-teal-500/20',
    },
    earnings: {
        label: 'Earnings',
        icon: Calendar,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
    },
    portfolio_risk: {
        label: 'Portfolio Risk',
        icon: ShieldAlert,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
    },
    ai_insight: {
        label: 'AI Insights',
        icon: Sparkles,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
};

const SEVERITY_BADGES: Record<
    SmartAlertSeverity,
    { label: string; style: string }
> = {
    critical: {
        label: 'CRITICAL',
        style: 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-950',
    },
    warning: {
        label: 'WARNING',
        style: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    },
    info: {
        label: 'INFO',
        style: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    },
    advisory: {
        label: 'ADVISORY',
        style: 'bg-gray-800 text-gray-300 border border-gray-700',
    },
};

export function SmartAlertCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'feed' | 'preferences'>('feed');
    const [alerts, setAlerts] = useState<SmartAlertItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [unreadOnly, setUnreadOnly] = useState(false);

    // Preferences state
    const [preferences, setPreferences] = useState<AlertNotificationPreferences>(
        DEFAULT_ALERT_PREFERENCES
    );
    const [savingPrefs, setSavingPrefs] = useState(false);

    // Load smart alerts
    const loadAlerts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ mode: 'smart' });
            if (selectedCategory !== 'all') {
                params.set('category', selectedCategory);
            }
            if (unreadOnly) {
                params.set('unreadOnly', 'true');
            }

            const res = await fetch(`/api/alerts?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setAlerts(data.data || []);
                }
            }
        } catch (err) {
            console.error('Failed to load smart alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load preferences
    const loadPreferences = async () => {
        try {
            const res = await fetch('/api/alerts/preferences');
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data) {
                    setPreferences(data.data);
                }
            }
        } catch (err) {
            console.error('Failed to load alert preferences:', err);
        }
    };

    useEffect(() => {
        loadAlerts();
        loadPreferences();
    }, [selectedCategory, unreadOnly]);

    // Save preferences
    const handleSavePreferences = async (newPrefs: AlertNotificationPreferences) => {
        setPreferences(newPrefs);
        setSavingPrefs(true);
        try {
            const res = await fetch('/api/alerts/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences: newPrefs }),
            });
            if (res.ok) {
                toast.success('Notification preferences updated');
                loadAlerts();
            } else {
                toast.error('Failed to save preferences');
            }
        } catch (err) {
            toast.error('Error saving preferences');
        } finally {
            setSavingPrefs(false);
        }
    };

    // Mark single alert read
    const markRead = async (alertId: string) => {
        try {
            await fetch('/api/alerts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertId }),
            });

            setAlerts((prev) =>
                prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
            );
        } catch (err) {
            console.error('Error marking alert read:', err);
        }
    };

    // Mark all alerts read
    const markAllRead = async () => {
        try {
            await fetch('/api/alerts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'markAllRead' }),
            });

            setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
            toast.success('All alerts marked as read');
        } catch (err) {
            toast.error('Failed to mark alerts as read');
        }
    };

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    // Helper for relative timestamps
    const formatTimeAgo = (ts: number) => {
        const diffMinutes = Math.floor((Date.now() - ts) / 60000);
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const hours = Math.floor(diffMinutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="relative">
            {/* Header Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="relative p-2 rounded-xl text-gray-400 hover:text-emerald-400 hover:bg-gray-800/60 transition-all border border-transparent hover:border-gray-700 focus:outline-none"
                aria-label="Smart Alerts"
                title="Smart Alerts & AI Insights"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow-lg shadow-rose-950 ring-2 ring-gray-950 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Slide-over Drawer / Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    {/* Backdrop click to close */}
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-gray-950 border-l border-gray-800 shadow-2xl shadow-black/80">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-gray-800/80 px-5 py-4 bg-gray-900/40 backdrop-blur">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-bold text-gray-100 tracking-wide">
                                            Smart Alerts & Insights
                                        </h2>
                                        {unreadCount > 0 && (
                                            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                                                {unreadCount} new
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400">
                                        Causality-driven real-time financial intelligence
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Sub-header Navigation Tabs */}
                        <div className="flex items-center justify-between border-b border-gray-800/60 bg-gray-900/20 px-5 py-2.5">
                            <div className="flex gap-1 bg-gray-900/80 p-0.5 rounded-lg border border-gray-800">
                                <button
                                    onClick={() => setActiveTab('feed')}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition ${activeTab === 'feed'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                >
                                    Alerts Feed ({alerts.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('preferences')}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${activeTab === 'preferences'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                >
                                    <SlidersHorizontal className="h-3 w-3" />
                                    Preferences
                                </button>
                            </div>

                            {activeTab === 'feed' && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={loadAlerts}
                                        disabled={loading}
                                        className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition"
                                        title="Refresh"
                                    >
                                        <RefreshCw
                                            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                                        />
                                    </button>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllRead}
                                            className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-emerald-400 px-2 py-1 rounded-lg hover:bg-gray-800/50 transition"
                                        >
                                            <CheckCheck className="h-3.5 w-3.5" />
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* TAB 1: ALERTS FEED */}
                        {activeTab === 'feed' && (
                            <div className="flex flex-col flex-1 overflow-hidden">
                                {/* Filter Bar */}
                                <div className="border-b border-gray-800/60 p-3 bg-gray-900/10 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                            <Filter className="h-3 w-3 text-emerald-400" />
                                            <span>Filter by Category:</span>
                                        </div>

                                        <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={unreadOnly}
                                                onChange={(e) => setUnreadOnly(e.target.checked)}
                                                className="rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-0 h-3.5 w-3.5"
                                            />
                                            <span>Unread only</span>
                                        </label>
                                    </div>

                                    {/* Category Scroll Pills */}
                                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                                        <button
                                            onClick={() => setSelectedCategory('all')}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${selectedCategory === 'all'
                                                    ? 'bg-gray-200 text-gray-950 font-bold'
                                                    : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800'
                                                }`}
                                        >
                                            All ({alerts.length})
                                        </button>
                                        {(
                                            Object.keys(CATEGORY_META) as SmartAlertCategory[]
                                        ).map((catKey) => {
                                            const meta = CATEGORY_META[catKey];
                                            const isSel = selectedCategory === catKey;
                                            return (
                                                <button
                                                    key={catKey}
                                                    onClick={() => setSelectedCategory(catKey)}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${isSel
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                                                            : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800'
                                                        }`}
                                                >
                                                    <meta.icon className={`h-3 w-3 ${meta.color}`} />
                                                    {meta.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Alerts List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {alerts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-gray-500 border border-gray-800 mb-3">
                                                <CheckCheck className="h-6 w-6" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-gray-300">
                                                You&apos;re all caught up
                                            </h3>
                                            <p className="text-xs text-gray-500 max-w-xs mt-1">
                                                No smart alerts matching your current category filter or severity criteria.
                                            </p>
                                        </div>
                                    ) : (
                                        alerts.map((alert) => {
                                            const meta =
                                                CATEGORY_META[alert.category] || CATEGORY_META.ai_insight;
                                            const sev =
                                                SEVERITY_BADGES[alert.severity] || SEVERITY_BADGES.info;

                                            return (
                                                <div
                                                    key={alert.id}
                                                    className={`group relative rounded-2xl border transition-all duration-200 p-4 ${alert.isRead
                                                            ? 'bg-gray-900/40 border-gray-800/60 opacity-85'
                                                            : 'bg-gray-900/90 border-gray-700 shadow-md shadow-black/40'
                                                        }`}
                                                >
                                                    {/* Top Row: Meta Tags, Priority, Time */}
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {/* Category Pill */}
                                                            <span
                                                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${meta.bg} ${meta.color}`}
                                                            >
                                                                <meta.icon className="h-2.5 w-2.5" />
                                                                {meta.label}
                                                            </span>

                                                            {/* Severity Badge */}
                                                            <span
                                                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold ${sev.style}`}
                                                            >
                                                                {sev.label}
                                                            </span>

                                                            {/* Symbol Tag */}
                                                            {alert.relatedSymbol && (
                                                                <span className="rounded-md bg-gray-800/80 border border-gray-700 px-1.5 py-0.5 text-[10px] font-bold text-gray-300 uppercase">
                                                                    {alert.relatedSymbol}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {/* Priority Score Indicator */}
                                                            <span
                                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${alert.priorityScore >= 75
                                                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                                        : alert.priorityScore >= 50
                                                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                            : 'bg-gray-800 text-gray-400 border-gray-700'
                                                                    }`}
                                                                title={`Priority Score: ${alert.priorityScore}/100`}
                                                            >
                                                                P{alert.priorityScore}
                                                            </span>

                                                            <span className="text-[10px] text-gray-500">
                                                                {formatTimeAgo(alert.timestamp)}
                                                            </span>

                                                            {!alert.isRead && (
                                                                <span
                                                                    className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"
                                                                    title="Unread"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Title & Event description */}
                                                    <h4 className="text-xs font-bold text-gray-100 mb-1 leading-snug">
                                                        {alert.title}
                                                    </h4>
                                                    <p className="text-[11px] text-gray-300 mb-2.5 leading-relaxed">
                                                        {alert.event}
                                                    </p>

                                                    {/* WHY IT MATTERS (HyperStocks causality differentiator) */}
                                                    <div className="rounded-xl bg-gradient-to-br from-gray-950 to-gray-900/80 border border-emerald-500/20 p-2.5 mb-3">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 mb-1">
                                                            <Sparkles className="h-3 w-3" />
                                                            <span>WHY IT MATTERS:</span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-400 leading-relaxed italic">
                                                            &ldquo;{alert.whyItMatters}&rdquo;
                                                        </p>
                                                    </div>

                                                    {/* Action & Read Toggle Bar */}
                                                    <div className="flex items-center justify-between pt-1 border-t border-gray-800/60 text-xs">
                                                        {alert.action?.href ? (
                                                            <Link
                                                                href={alert.action.href}
                                                                onClick={() => {
                                                                    markRead(alert.id);
                                                                    setIsOpen(false);
                                                                }}
                                                                className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300 text-[11px] transition"
                                                            >
                                                                <span>{alert.action.label}</span>
                                                                <ChevronRight className="h-3 w-3" />
                                                            </Link>
                                                        ) : (
                                                            <div />
                                                        )}

                                                        <button
                                                            onClick={() => markRead(alert.id)}
                                                            className={`inline-flex items-center gap-1 text-[10px] font-medium transition ${alert.isRead
                                                                    ? 'text-gray-600 cursor-default'
                                                                    : 'text-gray-400 hover:text-emerald-400'
                                                                }`}
                                                        >
                                                            <Check className="h-3 w-3" />
                                                            <span>{alert.isRead ? 'Read' : 'Mark as read'}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: PREFERENCES & SETTINGS */}
                        {activeTab === 'preferences' && (
                            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider mb-1">
                                        Alert Categories
                                    </h3>
                                    <p className="text-[11px] text-gray-400 mb-3">
                                        Select which types of intelligence triggers you want to receive.
                                    </p>

                                    <div className="space-y-2">
                                        {(
                                            Object.keys(CATEGORY_META) as SmartAlertCategory[]
                                        ).map((catKey) => {
                                            const meta = CATEGORY_META[catKey];
                                            const isChecked =
                                                preferences.enabledCategories[catKey] !== false;

                                            return (
                                                <div
                                                    key={catKey}
                                                    onClick={() => {
                                                        const updated = {
                                                            ...preferences,
                                                            enabledCategories: {
                                                                ...preferences.enabledCategories,
                                                                [catKey]: !isChecked,
                                                            },
                                                        };
                                                        handleSavePreferences(updated);
                                                    }}
                                                    className="flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900/80 cursor-pointer transition"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div
                                                            className={`flex h-7 w-7 items-center justify-center rounded-lg border ${meta.bg}`}
                                                        >
                                                            <meta.icon className={`h-3.5 w-3.5 ${meta.color}`} />
                                                        </div>
                                                        <span className="text-xs font-semibold text-gray-200">
                                                            {meta.label}
                                                        </span>
                                                    </div>

                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => { }}
                                                        className="rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-0 h-4 w-4"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Minimum Severity Filter */}
                                <div className="border-t border-gray-800 pt-4">
                                    <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider mb-1">
                                        Minimum Severity Threshold
                                    </h3>
                                    <p className="text-[11px] text-gray-400 mb-2">
                                        Filter out low-urgency notifications.
                                    </p>

                                    <select
                                        value={preferences.minSeverity}
                                        onChange={(e) => {
                                            const updated = {
                                                ...preferences,
                                                minSeverity: e.target.value as SmartAlertSeverity,
                                            };
                                            handleSavePreferences(updated);
                                        }}
                                        className="w-full rounded-xl bg-gray-900 border border-gray-800 px-3 py-2 text-xs text-gray-200 focus:border-emerald-500 focus:outline-none"
                                    >
                                        <option value="advisory">Advisory & Above (All Alerts)</option>
                                        <option value="info">Info & Above</option>
                                        <option value="warning">Warning & Critical Only</option>
                                        <option value="critical">Critical Only</option>
                                    </select>
                                </div>

                                {/* Quiet Hours */}
                                <div className="border-t border-gray-800 pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Moon className="h-4 w-4 text-indigo-400" />
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-100">
                                                    Quiet Hours
                                                </h3>
                                                <p className="text-[10px] text-gray-400">
                                                    Mute non-critical alerts during sleep
                                                </p>
                                            </div>
                                        </div>

                                        <input
                                            type="checkbox"
                                            checked={preferences.quietHours?.enabled ?? false}
                                            onChange={(e) => {
                                                const updated = {
                                                    ...preferences,
                                                    quietHours: {
                                                        enabled: e.target.checked,
                                                        start: preferences.quietHours?.start || '22:00',
                                                        end: preferences.quietHours?.end || '07:00',
                                                    },
                                                };
                                                handleSavePreferences(updated);
                                            }}
                                            className="rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-0 h-4 w-4"
                                        />
                                    </div>

                                    {preferences.quietHours?.enabled && (
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={preferences.quietHours.start}
                                                    onChange={(e) => {
                                                        const updated = {
                                                            ...preferences,
                                                            quietHours: {
                                                                ...preferences.quietHours!,
                                                                start: e.target.value,
                                                            },
                                                        };
                                                        handleSavePreferences(updated);
                                                    }}
                                                    className="w-full rounded-lg bg-gray-900 border border-gray-800 px-2 py-1 text-xs text-gray-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">
                                                    End Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={preferences.quietHours.end}
                                                    onChange={(e) => {
                                                        const updated = {
                                                            ...preferences,
                                                            quietHours: {
                                                                ...preferences.quietHours!,
                                                                end: e.target.value,
                                                            },
                                                        };
                                                        handleSavePreferences(updated);
                                                    }}
                                                    className="w-full rounded-lg bg-gray-900 border border-gray-800 px-2 py-1 text-xs text-gray-200"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Delivery Channels */}
                                <div className="border-t border-gray-800 pt-4">
                                    <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider mb-2">
                                        Notification Channels
                                    </h3>
                                    <div className="space-y-2 text-xs">
                                        <label className="flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-gray-900/40 cursor-pointer">
                                            <span className="text-gray-300">Daily Email Digest</span>
                                            <input
                                                type="checkbox"
                                                checked={preferences.emailDigest}
                                                onChange={(e) => {
                                                    const updated = {
                                                        ...preferences,
                                                        emailDigest: e.target.checked,
                                                    };
                                                    handleSavePreferences(updated);
                                                }}
                                                className="rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-0 h-4 w-4"
                                            />
                                        </label>
                                        <label className="flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-gray-900/40 cursor-pointer">
                                            <span className="text-gray-300">Web Push Notifications</span>
                                            <input
                                                type="checkbox"
                                                checked={preferences.pushEnabled}
                                                onChange={(e) => {
                                                    const updated = {
                                                        ...preferences,
                                                        pushEnabled: e.target.checked,
                                                    };
                                                    handleSavePreferences(updated);
                                                }}
                                                className="rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-0 h-4 w-4"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
