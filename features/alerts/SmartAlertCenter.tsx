'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    AlertTriangle,
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
        color: 'text-[#3DFFA0]',
        bg: 'bg-[#3DFFA0]/10 border-[#3DFFA0]/20',
    },
    percentage_movement: {
        label: 'Movements',
        icon: Flame,
        color: 'text-[#FACC15]',
        bg: 'bg-[#FACC15]/10 border-[#FACC15]/20',
    },
    volume: {
        label: 'Volume Spikes',
        icon: Volume2,
        color: 'text-[#35D6FF]',
        bg: 'bg-[#35D6FF]/10 border-[#35D6FF]/20',
    },
    technical_signal: {
        label: 'Technicals',
        icon: Activity,
        color: 'text-[#7C5CFF]',
        bg: 'bg-[#7C5CFF]/10 border-[#7C5CFF]/20',
    },
    news: {
        label: 'News Impact',
        icon: Newspaper,
        color: 'text-[#38BDF8]',
        bg: 'bg-[#38BDF8]/10 border-[#38BDF8]/20',
    },
    earnings: {
        label: 'Earnings',
        icon: Calendar,
        color: 'text-[#C084FC]',
        bg: 'bg-[#C084FC]/10 border-[#C084FC]/20',
    },
    portfolio_risk: {
        label: 'Portfolio Risk',
        icon: ShieldAlert,
        color: 'text-[#FF5470]',
        bg: 'bg-[#FF5470]/10 border-[#FF5470]/20',
    },
    ai_insight: {
        label: 'AI Insights',
        icon: Sparkles,
        color: 'text-[#35D6FF]',
        bg: 'bg-[#35D6FF]/10 border-[#35D6FF]/20',
    },
    downside_risk: {
        label: 'Downside Risk',
        icon: AlertTriangle,
        color: 'text-[#FF5470]',
        bg: 'bg-[#FF5470]/10 border-[#FF5470]/20',
    },
};

const SEVERITY_BADGES: Record<
    SmartAlertSeverity,
    { label: string; style: string }
> = {
    critical: {
        label: 'CRITICAL',
        style: 'bg-[#FF5470]/20 text-[#FF5470] border border-[#FF5470]/40',
    },
    warning: {
        label: 'WARNING',
        style: 'bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30',
    },
    info: {
        label: 'INFO',
        style: 'bg-[#35D6FF]/20 text-[#35D6FF] border border-[#35D6FF]/30',
    },
    advisory: {
        label: 'ADVISORY',
        style: 'bg-[#111B2E] text-[#94A3B8] border border-[rgba(148,163,184,0.18)]',
    },
};

export function SmartAlertCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'feed' | 'preferences'>('feed');
    const [alerts, setAlerts] = useState<SmartAlertItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [unreadOnly, setUnreadOnly] = useState(false);

    // Preferences state
    const [preferences, setPreferences] = useState<AlertNotificationPreferences>(
        DEFAULT_ALERT_PREFERENCES
    );

    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const inFlightRef = useRef(false);

    // Load smart alerts
    const loadAlerts = async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setLoading(true);
        setError(null);

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
                } else {
                    setError(data.error || 'Failed to fetch notifications');
                }
            } else if (res.status === 401) {
                // Not authenticated yet
                setAlerts([]);
            } else {
                setError('Unable to load notifications at this time');
            }
        } catch (err: any) {
            console.error('Failed to load notifications:', err);
            setError('Network error loading notifications');
        } finally {
            setLoading(false);
            inFlightRef.current = false;
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

    // Handle outside clicks and Escape key to close popover
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Save preferences
    const handleSavePreferences = async (newPrefs: AlertNotificationPreferences) => {
        setPreferences(newPrefs);
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
        } catch {
            toast.error('Error saving preferences');
        }
    };

    // Mark single alert read
    const markRead = async (alertId: string) => {
        try {
            await fetch('/api/alerts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark-read', alertId }),
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
                body: JSON.stringify({ action: 'mark-all-read' }),
            });

            setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
            toast.success('All notifications marked as read');
        } catch {
            toast.error('Failed to mark notifications as read');
        }
    };

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    // Helper for relative timestamps
    const formatTimeAgo = (ts: number) => {
        if (!ts) return 'Recent';
        const diffMinutes = Math.floor((Date.now() - ts) / 60000);
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const hours = Math.floor(diffMinutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Header Bell Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`relative p-2 rounded-xl transition-all duration-200 border focus:outline-none ${
                    isOpen
                        ? 'bg-[#111B2E] text-[#35D6FF] border-[#7C5CFF]/40 shadow-[0_0_15px_rgba(53,214,255,0.2)]'
                        : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E] border-transparent hover:border-[rgba(148,163,184,0.16)]'
                }`}
                aria-label="Notifications"
                aria-expanded={isOpen}
                title="Notifications & Smart Alerts"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FF5470] px-1 text-[10px] font-extrabold text-[#050816] shadow-[0_0_8px_#FF5470] ring-2 ring-[#050816]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown / Popover */}
            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[410px] max-w-[410px] rounded-2xl bg-[#0D1424]/95 border border-[#7C5CFF]/30 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Notifications dropdown"
                >
                    {/* Popover Header */}
                    <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.14)] px-4 py-3.5 bg-[#080D1B]/90">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-[#F4F7FF] tracking-wide">
                                Notifications
                            </h2>
                            {unreadCount > 0 ? (
                                <span className="rounded-full bg-[#FF5470]/15 text-[#FF5470] border border-[#FF5470]/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                                    {unreadCount} unread
                                </span>
                            ) : (
                                <span className="rounded-full bg-[#3DFFA0]/15 text-[#3DFFA0] border border-[#3DFFA0]/30 px-2 py-0.5 text-[10px] font-mono">
                                    All read
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && activeTab === 'feed' && (
                                <button
                                    type="button"
                                    onClick={markAllRead}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-[#35D6FF] hover:text-[#3DFFA0] px-2 py-1 rounded-lg hover:bg-[#111B2E] transition"
                                    title="Mark all as read"
                                >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    <span>Mark all read</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() =>
                                    setActiveTab((prev) =>
                                        prev === 'feed' ? 'preferences' : 'feed'
                                    )
                                }
                                className={`p-1.5 rounded-lg transition ${
                                    activeTab === 'preferences'
                                        ? 'bg-[#7C5CFF]/20 text-[#35D6FF]'
                                        : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E]'
                                }`}
                                title={
                                    activeTab === 'preferences'
                                        ? 'Back to feed'
                                        : 'Notification Preferences'
                                }
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#111B2E] hover:text-[#F4F7FF] transition"
                                aria-label="Close notifications"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Sub-header Filter Bar (Feed Tab) */}
                    {activeTab === 'feed' && (
                        <div className="border-b border-[rgba(148,163,184,0.12)] p-2.5 bg-[#080D1B]/50 flex items-center justify-between gap-2 text-xs">
                            {/* Category Filter Pills */}
                            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                                        selectedCategory === 'all'
                                            ? 'bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-[#050816]'
                                            : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E]'
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
                                            type="button"
                                            onClick={() => setSelectedCategory(catKey)}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                                                isSel
                                                    ? 'bg-[#7C5CFF]/20 text-[#35D6FF] border border-[#7C5CFF]/40'
                                                    : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E]'
                                            }`}
                                        >
                                            <meta.icon className={`h-3 w-3 ${meta.color}`} />
                                            <span>{meta.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <label className="flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-[#F4F7FF] cursor-pointer whitespace-nowrap ml-1 shrink-0">
                                <input
                                    type="checkbox"
                                    checked={unreadOnly}
                                    onChange={(e) => setUnreadOnly(e.target.checked)}
                                    className="rounded border-[rgba(148,163,184,0.25)] bg-[#111B2E] text-[#35D6FF] focus:ring-0 h-3 w-3"
                                />
                                <span>Unread only</span>
                            </label>
                        </div>
                    )}

                    {/* Notification Body Content */}
                    <div className="max-h-[460px] overflow-y-auto p-3 space-y-2.5">
                        {/* Error State */}
                        {error && (
                            <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl bg-[#FF5470]/10 border border-[#FF5470]/30 my-2">
                                <AlertTriangle className="h-7 w-7 text-[#FF5470] mb-2" />
                                <h3 className="text-xs font-bold text-[#F4F7FF]">
                                    {error}
                                </h3>
                                <p className="text-[11px] text-[#94A3B8] mt-1 mb-3">
                                    Unable to connect to live alert streams.
                                </p>
                                <button
                                    type="button"
                                    onClick={loadAlerts}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111B2E] border border-[rgba(148,163,184,0.18)] hover:border-[#7C5CFF] text-xs font-semibold text-[#F4F7FF] transition"
                                >
                                    <RefreshCw className="h-3 w-3 text-[#35D6FF]" />
                                    <span>Try Again</span>
                                </button>
                            </div>
                        )}

                        {/* Loading Skeletons */}
                        {loading && alerts.length === 0 && !error && (
                            <div className="space-y-2.5 py-2">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111B2E]/50 p-3 space-y-2 animate-pulse"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="h-3 w-20 bg-[rgba(148,163,184,0.2)] rounded" />
                                            <div className="h-3 w-12 bg-[rgba(148,163,184,0.2)] rounded" />
                                        </div>
                                        <div className="h-3.5 w-3/4 bg-[rgba(148,163,184,0.2)] rounded" />
                                        <div className="h-3 w-full bg-[rgba(148,163,184,0.15)] rounded" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !error && alerts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111B2E] text-[#35D6FF] border border-[rgba(148,163,184,0.16)] mb-3 shadow-[0_0_20px_rgba(53,214,255,0.1)]">
                                    <CheckCheck className="h-6 w-6" />
                                </div>
                                <h3 className="text-xs font-bold text-[#F4F7FF]">
                                    No notifications right now
                                </h3>
                                <p className="text-[11px] text-[#94A3B8] max-w-xs mt-1 leading-relaxed">
                                    You&apos;re all caught up! Market alerts, unusual volume spikes, and AI telemetry triggers will appear here.
                                </p>
                            </div>
                        )}

                        {/* TAB 1: Notification Items Feed */}
                        {activeTab === 'feed' &&
                            alerts.map((alert) => {
                                const meta =
                                    CATEGORY_META[alert.category] || CATEGORY_META.ai_insight;
                                const sev =
                                    SEVERITY_BADGES[alert.severity] || SEVERITY_BADGES.info;

                                return (
                                    <div
                                        key={alert.id}
                                        className={`group relative rounded-xl border transition-all duration-200 p-3 ${
                                            alert.isRead
                                                ? 'bg-[#080D1B]/60 border-[rgba(148,163,184,0.12)] opacity-80 hover:opacity-100 hover:border-[#7C5CFF]/30'
                                                : 'bg-[#111B2E]/90 border-[rgba(124,92,255,0.3)] shadow-md shadow-black/40 hover:border-[#35D6FF]/50'
                                        }`}
                                    >
                                        {/* Top Meta Header */}
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${meta.bg} ${meta.color}`}
                                                >
                                                    <meta.icon className="h-2.5 w-2.5" />
                                                    {meta.label}
                                                </span>

                                                <span
                                                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${sev.style}`}
                                                >
                                                    {sev.label}
                                                </span>

                                                {alert.relatedSymbol && (
                                                    <span className="rounded-md bg-[#080D1B] border border-[rgba(148,163,184,0.18)] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#35D6FF] uppercase">
                                                        ${alert.relatedSymbol}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-[#94A3B8] font-mono">
                                                    {formatTimeAgo(alert.timestamp)}
                                                </span>

                                                {!alert.isRead && (
                                                    <span
                                                        className="h-2 w-2 rounded-full bg-[#35D6FF] shadow-[0_0_8px_#35D6FF]"
                                                        title="Unread notification"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Title & Short Description */}
                                        <h4 className="text-xs font-bold text-[#F4F7FF] mb-1 leading-snug">
                                            {alert.title}
                                        </h4>
                                        <p className="text-[11px] text-[#94A3B8] mb-2 leading-relaxed">
                                            {alert.event}
                                        </p>

                                        {/* Causality Note (Why it matters) */}
                                        {alert.whyItMatters && (
                                            <div className="rounded-lg bg-[#080D1B]/80 border border-[#7C5CFF]/20 p-2 mb-2 text-[10px] text-[#F4F7FF]/90">
                                                <span className="font-bold text-[#35D6FF] mr-1">
                                                    Why it matters:
                                                </span>
                                                <span className="italic text-[#94A3B8]">
                                                    {alert.whyItMatters}
                                                </span>
                                            </div>
                                        )}

                                        {/* Actions bar */}
                                        <div className="flex items-center justify-between pt-1 border-t border-[rgba(148,163,184,0.1)] text-xs">
                                            {alert.action?.href ? (
                                                <Link
                                                    href={alert.action.href}
                                                    onClick={() => {
                                                        markRead(alert.id);
                                                        setIsOpen(false);
                                                    }}
                                                    className="inline-flex items-center gap-1 font-bold text-[#35D6FF] hover:text-[#3DFFA0] text-[10px] transition"
                                                >
                                                    <span>{alert.action.label}</span>
                                                    <ChevronRight className="h-3 w-3" />
                                                </Link>
                                            ) : (
                                                <div />
                                            )}

                                            {!alert.isRead && (
                                                <button
                                                    type="button"
                                                    onClick={() => markRead(alert.id)}
                                                    className="inline-flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-[#35D6FF] transition"
                                                >
                                                    <Check className="h-3 w-3" />
                                                    <span>Mark as read</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                        {/* TAB 2: Preferences Tab */}
                        {activeTab === 'preferences' && (
                            <div className="p-1 space-y-4 text-xs">
                                <div>
                                    <h3 className="text-xs font-bold text-[#F4F7FF] uppercase tracking-wider mb-1">
                                        Alert Categories
                                    </h3>
                                    <p className="text-[11px] text-[#94A3B8] mb-2.5">
                                        Toggle categories of financial intelligence triggers.
                                    </p>

                                    <div className="space-y-1.5">
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
                                                    className="flex items-center justify-between p-2 rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#111B2E]/50 hover:bg-[#111B2E] cursor-pointer transition"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`flex h-6 w-6 items-center justify-center rounded-lg border ${meta.bg}`}
                                                        >
                                                            <meta.icon className={`h-3 w-3 ${meta.color}`} />
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-[#F4F7FF]">
                                                            {meta.label}
                                                        </span>
                                                    </div>

                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}}
                                                        className="rounded border-[rgba(148,163,184,0.25)] bg-[#080D1B] text-[#35D6FF] focus:ring-0 h-3.5 w-3.5"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Minimum Severity Filter */}
                                <div className="border-t border-[rgba(148,163,184,0.12)] pt-3">
                                    <h3 className="text-xs font-bold text-[#F4F7FF] uppercase tracking-wider mb-1">
                                        Minimum Severity Threshold
                                    </h3>
                                    <select
                                        value={preferences.minSeverity}
                                        onChange={(e) => {
                                            const updated = {
                                                ...preferences,
                                                minSeverity: e.target.value as SmartAlertSeverity,
                                            };
                                            handleSavePreferences(updated);
                                        }}
                                        className="w-full rounded-xl bg-[#080D1B] border border-[rgba(148,163,184,0.18)] px-3 py-1.5 text-xs text-[#F4F7FF] focus:border-[#7C5CFF] focus:outline-none"
                                    >
                                        <option value="advisory">Advisory & Above (All)</option>
                                        <option value="info">Info & Above</option>
                                        <option value="warning">Warning & Critical Only</option>
                                        <option value="critical">Critical Only</option>
                                    </select>
                                </div>

                                {/* Delivery Channels */}
                                <div className="border-t border-[rgba(148,163,184,0.12)] pt-3">
                                    <h3 className="text-xs font-bold text-[#F4F7FF] uppercase tracking-wider mb-2">
                                        Notification Channels
                                    </h3>
                                    <div className="space-y-1.5">
                                        <label className="flex items-center justify-between p-2 rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#111B2E]/50 cursor-pointer">
                                            <span className="text-[11px] text-[#F4F7FF]">Daily Digest Email</span>
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
                                                className="rounded border-[rgba(148,163,184,0.25)] bg-[#080D1B] text-[#35D6FF] focus:ring-0 h-3.5 w-3.5"
                                            />
                                        </label>
                                        <label className="flex items-center justify-between p-2 rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#111B2E]/50 cursor-pointer">
                                            <span className="text-[11px] text-[#F4F7FF]">Browser Push Alerts</span>
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
                                                className="rounded border-[rgba(148,163,184,0.25)] bg-[#080D1B] text-[#35D6FF] focus:ring-0 h-3.5 w-3.5"
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
