'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
    getUserSchedulingPreferences,
    updateUserSchedulingPreferences,
} from '@/lib/actions/user.actions';
import {
    getUserAlertPreferences,
    updateUserAlertPreferences,
} from '@/lib/actions/alert.actions';
import {
    Bell,
    Calendar,
    CheckCircle2,
    Clock,
    Globe,
    Mail,
    PauseCircle,
    PlayCircle,
    RotateCw,
    Send,
    Shield,
    Sparkles,
} from 'lucide-react';

const COMMON_TIMEZONES = [
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30) - Default' },
    { value: 'America/New_York', label: 'America/New_York (Eastern, UTC-5/-4)' },
    { value: 'America/Chicago', label: 'America/Chicago (Central, UTC-6/-5)' },
    { value: 'America/Denver', label: 'America/Denver (Mountain, UTC-7/-6)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific, UTC-8/-7)' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+0/+1)' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST, UTC+1/+2)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST, UTC+1/+2)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST, UTC+10/+11)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

const WEEKDAYS = [
    { day: 1, label: 'Mon' },
    { day: 2, label: 'Tue' },
    { day: 3, label: 'Wed' },
    { day: 4, label: 'Thu' },
    { day: 5, label: 'Fri' },
    { day: 6, label: 'Sat' },
    { day: 0, label: 'Sun' },
];

export default function SettingsPage() {
    const { user, isLoaded } = useUser();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form states - Scheduling
    const [newsEmailEnabled, setNewsEmailEnabled] = useState(true);
    const [timezone, setTimezone] = useState('Asia/Kolkata');
    const [deliveryMode, setDeliveryMode] = useState<'daily' | 'interval'>('daily');
    const [preferredDeliveryTime, setPreferredDeliveryTime] = useState('08:00');
    const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState(240);
    const [deliveryDays, setDeliveryDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [isSchedulePaused, setIsSchedulePaused] = useState(false);
    const [lastDelivery, setLastDelivery] = useState<string | null>(null);
    const [nextDelivery, setNextDelivery] = useState<string | null>(null);

    // Form states - Phase 3: Quantitative Downside Risk Alerts
    const [downsideRiskAlertsEnabled, setDownsideRiskAlertsEnabled] = useState(true);
    const [downsideRiskMinSeverity, setDownsideRiskMinSeverity] = useState<'critical' | 'warning' | 'advisory'>('warning');
    const [downsideRiskCooldownHours, setDownsideRiskCooldownHours] = useState(24);
    const [downsideRiskCategories, setDownsideRiskCategories] = useState<{
        volatility_spike: boolean;
        drawdown: boolean;
        ma_breakdown: boolean;
        var_exceedance: boolean;
        historical_low: boolean;
    }>({
        volatility_spike: true,
        drawdown: true,
        ma_breakdown: true,
        var_exceedance: true,
        historical_low: true,
    });
    const [testingRiskEmail, setTestingRiskEmail] = useState(false);

    useEffect(() => {
        if (!isLoaded || !user?.id) return;

        async function loadPrefs() {
            try {
                setLoading(true);
                const [schedData, alertData] = await Promise.all([
                    getUserSchedulingPreferences(user!.id),
                    getUserAlertPreferences().catch(() => null),
                ]);

                setNewsEmailEnabled(schedData.newsEmailEnabled);
                setTimezone(schedData.timezone);
                setDeliveryMode(schedData.deliveryMode);
                setPreferredDeliveryTime(schedData.preferredDeliveryTime);
                setScheduleIntervalMinutes(schedData.scheduleIntervalMinutes);
                setDeliveryDays(schedData.deliveryDays);
                setIsSchedulePaused(schedData.isSchedulePaused);
                setLastDelivery(schedData.lastNewsDeliveryAt);
                setNextDelivery(schedData.nextNewsDeliveryAt);

                if (alertData?.preferences) {
                    const p = alertData.preferences;
                    if (p.downsideRiskAlertsEnabled !== undefined) setDownsideRiskAlertsEnabled(p.downsideRiskAlertsEnabled);
                    if (p.downsideRiskMinSeverity) setDownsideRiskMinSeverity(p.downsideRiskMinSeverity as any);
                    if (p.downsideRiskCooldownHours) setDownsideRiskCooldownHours(p.downsideRiskCooldownHours);
                    if (p.downsideRiskCategories) {
                        setDownsideRiskCategories({
                            volatility_spike: p.downsideRiskCategories.volatility_spike !== false,
                            drawdown: p.downsideRiskCategories.drawdown !== false,
                            ma_breakdown: p.downsideRiskCategories.ma_breakdown !== false,
                            var_exceedance: p.downsideRiskCategories.var_exceedance !== false,
                            historical_low: p.downsideRiskCategories.historical_low !== false,
                        });
                    }
                }
            } catch (err: any) {
                setStatusMessage({ type: 'error', text: err?.message || 'Failed to load scheduling preferences' });
            } finally {
                setLoading(false);
            }
        }

        loadPrefs();
    }, [isLoaded, user?.id]);

    const handleWeekdayToggle = (day: number) => {
        if (deliveryDays.includes(day)) {
            // Keep at least one day selected
            if (deliveryDays.length > 1) {
                setDeliveryDays(deliveryDays.filter((d) => d !== day));
            }
        } else {
            setDeliveryDays([...deliveryDays, day].sort());
        }
    };

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        setStatusMessage(null);

        try {
            const [schedRes, alertRes] = await Promise.all([
                updateUserSchedulingPreferences(user.id, {
                    newsEmailEnabled,
                    timezone,
                    deliveryMode,
                    preferredDeliveryTime,
                    scheduleIntervalMinutes,
                    deliveryDays,
                    isSchedulePaused,
                }),
                updateUserAlertPreferences({
                    downsideRiskAlertsEnabled,
                    downsideRiskMinSeverity,
                    downsideRiskCooldownHours,
                    downsideRiskCategories,
                }),
            ]);

            if (schedRes.success && schedRes.preferences) {
                setNextDelivery(schedRes.preferences.nextNewsDeliveryAt);
                setStatusMessage({ type: 'success', text: 'Scheduling and downside-risk alert preferences updated successfully.' });
            }
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err?.message || 'Failed to save preferences' });
        } finally {
            setSaving(false);
        }
    };

    const handleSendTestEmail = async () => {
        setTestingEmail(true);
        setStatusMessage(null);

        try {
            const res = await fetch('/api/alerts/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'personalized_news' }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setStatusMessage({
                    type: 'success',
                    text: `Test digest dispatched successfully to ${data.recipient}! (${data.articlesCount || 0} watchlist articles included)`,
                });
            } else {
                setStatusMessage({
                    type: 'error',
                    text: data.error || 'Failed to dispatch test email',
                });
            }
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err?.message || 'Error triggering test email' });
        } finally {
            setTestingEmail(false);
        }
    };

    const handleSendTestRiskAlert = async () => {
        setTestingRiskEmail(true);
        setStatusMessage(null);

        try {
            const res = await fetch('/api/alerts/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'downside_risk' }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setStatusMessage({
                    type: 'success',
                    text: `Test Downside-Risk Alert dispatched successfully to ${data.recipient} for ${data.symbol || 'watchlist stock'}! (Risk score: ${data.riskScore}/100)`,
                });
            } else {
                setStatusMessage({
                    type: 'error',
                    text: data.error || 'Failed to dispatch downside risk test alert',
                });
            }
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err?.message || 'Error triggering test alert' });
        } finally {
            setTestingRiskEmail(false);
        }
    };

    if (!isLoaded || loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
                <RotateCw className="w-8 h-8 text-[#7C5CFF] animate-spin" />
                <p className="text-sm text-gray-400">Loading delivery preferences...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(124,92,255,0.2)] pb-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#7C5CFF]/10 text-[#35D6FF] border border-[#7C5CFF]/30 mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        Intelligence Engine Foundation
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        Email & Delivery Scheduling
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Configure timezone-aware personalized stock news digests based on your watchlist.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleSendTestEmail}
                        disabled={testingEmail}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0D1226] text-gray-200 border border-[#7C5CFF]/40 hover:border-[#35D6FF] hover:text-white transition-all shadow-sm disabled:opacity-50"
                    >
                        <Send className={`w-3.5 h-3.5 ${testingEmail ? 'animate-pulse text-[#35D6FF]' : ''}`} />
                        {testingEmail ? 'Dispatching...' : 'Test News Digest'}
                    </button>

                    <button
                        onClick={handleSendTestRiskAlert}
                        disabled={testingRiskEmail}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0D1226] text-rose-300 border border-rose-500/40 hover:border-rose-400 hover:text-white transition-all shadow-sm disabled:opacity-50"
                    >
                        <Shield className={`w-3.5 h-3.5 ${testingRiskEmail ? 'animate-pulse text-rose-400' : ''}`} />
                        {testingRiskEmail ? 'Dispatching...' : 'Test Risk Alert'}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-white shadow-lg hover:shadow-[#7C5CFF]/30 hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Status Feedback Banner */}
            {statusMessage && (
                <div
                    className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
                        statusMessage.type === 'success'
                            ? 'bg-[#3DFFA0]/10 border-[#3DFFA0]/30 text-[#3DFFA0]'
                            : 'bg-[#FF5470]/10 border-[#FF5470]/30 text-[#FF5470]'
                    }`}
                >
                    {statusMessage.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                        <p className="font-semibold">{statusMessage.type === 'success' ? 'Success' : 'Notice'}</p>
                        <p className="text-xs opacity-90">{statusMessage.text}</p>
                    </div>
                </div>
            )}

            {/* Schedule Status Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#090D22]/80 border border-[rgba(124,92,255,0.2)]">
                    <span className="text-xs text-gray-400 block mb-1">Schedule Status</span>
                    <div className="flex items-center gap-2">
                        <span
                            className={`w-2.5 h-2.5 rounded-full ${
                                !newsEmailEnabled
                                    ? 'bg-gray-500'
                                    : isSchedulePaused
                                    ? 'bg-[#FFB800]'
                                    : 'bg-[#3DFFA0]'
                            }`}
                        />
                        <span className="font-semibold text-white text-sm">
                            {!newsEmailEnabled ? 'Disabled' : isSchedulePaused ? 'Paused' : 'Active'}
                        </span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#090D22]/80 border border-[rgba(124,92,255,0.2)]">
                    <span className="text-xs text-gray-400 block mb-1">Last Delivery</span>
                    <span className="font-medium text-gray-200 text-sm">
                        {lastDelivery ? new Date(lastDelivery).toLocaleString() : 'No delivery recorded yet'}
                    </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#090D22]/80 border border-[rgba(124,92,255,0.2)]">
                    <span className="text-xs text-gray-400 block mb-1">Next Delivery Window</span>
                    <span className="font-medium text-[#35D6FF] text-sm">
                        {nextDelivery ? new Date(nextDelivery).toLocaleString() : 'Calculated upon save'}
                    </span>
                </div>
            </div>

            {/* Master Subscription & Pause Controls */}
            <div className="p-6 rounded-2xl bg-[#090D22]/90 border border-[rgba(124,92,255,0.2)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[#7C5CFF]/10 text-[#7C5CFF] border border-[#7C5CFF]/20">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Personalized News Emails</h2>
                            <p className="text-xs text-gray-400">
                                Receive curated catalysts, earnings reports, and breaking news for your watchlist.
                            </p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={newsEmailEnabled}
                            onChange={(e) => setNewsEmailEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C5CFF]"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between border-t border-[rgba(124,92,255,0.12)] pt-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[#35D6FF]/10 text-[#35D6FF] border border-[#35D6FF]/20">
                            {isSchedulePaused ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Temporary Schedule Pause</h3>
                            <p className="text-xs text-gray-400">
                                Temporarily halt scheduled sends without clearing your watchlist or preferences.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsSchedulePaused(!isSchedulePaused)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            isSchedulePaused
                                ? 'bg-[#3DFFA0]/10 border-[#3DFFA0]/40 text-[#3DFFA0] hover:bg-[#3DFFA0]/20'
                                : 'bg-[#FF5470]/10 border-[#FF5470]/40 text-[#FF5470] hover:bg-[#FF5470]/20'
                        }`}
                    >
                        {isSchedulePaused ? 'Resume Schedule' : 'Pause Schedule'}
                    </button>
                </div>
            </div>

            {/* Frequency & Mode */}
            <div className="p-6 rounded-2xl bg-[#090D22]/90 border border-[rgba(124,92,255,0.2)] space-y-6">
                <div>
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#35D6FF]" />
                        Delivery Mode & Frequency
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Choose between a once-daily morning briefing or recurring interval updates during trading days.
                    </p>
                </div>

                {/* Segmented Mode Selector */}
                <div className="grid grid-cols-2 gap-3 p-1.5 rounded-xl bg-[#050816] border border-gray-800">
                    <button
                        type="button"
                        onClick={() => setDeliveryMode('daily')}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                            deliveryMode === 'daily'
                                ? 'bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Daily Digest
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeliveryMode('interval')}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                            deliveryMode === 'interval'
                                ? 'bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Interval Updates
                    </button>
                </div>

                {/* Mode Options */}
                {deliveryMode === 'daily' ? (
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-200 block">Preferred Local Delivery Time</label>
                                <span className="text-xs text-gray-400">Scheduled in your configured timezone</span>
                            </div>
                            <input
                                type="time"
                                value={preferredDeliveryTime}
                                onChange={(e) => setPreferredDeliveryTime(e.target.value)}
                                className="px-4 py-2 rounded-xl bg-[#050816] text-white border border-gray-700 focus:border-[#7C5CFF] focus:outline-none text-sm"
                            />
                        </div>

                        <div className="pt-3 border-t border-[rgba(124,92,255,0.12)]">
                            <label className="text-sm font-semibold text-gray-200 block mb-2">Active Delivery Days</label>
                            <div className="flex flex-wrap gap-2">
                                {WEEKDAYS.map(({ day, label }) => {
                                    const selected = deliveryDays.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => handleWeekdayToggle(day)}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                                selected
                                                    ? 'bg-[#7C5CFF] border-[#7C5CFF] text-white shadow-sm'
                                                    : 'bg-[#050816] border-gray-800 text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-200 block">Update Interval</label>
                                <span className="text-xs text-gray-400">Minimum time between consecutive digests</span>
                            </div>
                            <select
                                value={scheduleIntervalMinutes}
                                onChange={(e) => setScheduleIntervalMinutes(parseInt(e.target.value, 10))}
                                className="px-4 py-2 rounded-xl bg-[#050816] text-white border border-gray-700 focus:border-[#7C5CFF] focus:outline-none text-sm"
                            >
                                <option value={60}>Every 1 hour (60 min)</option>
                                <option value={120}>Every 2 hours (120 min)</option>
                                <option value={240}>Every 4 hours (240 min) - Recommended</option>
                                <option value={360}>Every 6 hours (360 min)</option>
                                <option value={720}>Every 12 hours (720 min)</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Timezone Configuration */}
            <div className="p-6 rounded-2xl bg-[#090D22]/90 border border-[rgba(124,92,255,0.2)] space-y-4">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#7C5CFF]" />
                    <h2 className="text-base font-semibold text-white">Timezone & Clock Calculation</h2>
                </div>
                <p className="text-xs text-gray-400">
                    Daylight saving time transitions and daily local clock hours are automatically evaluated for this IANA timezone.
                </p>

                <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#050816] text-white border border-gray-700 focus:border-[#7C5CFF] focus:outline-none text-sm"
                >
                    {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                            {tz.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Phase 3: Quantitative Downside Risk Alert Preferences */}
            <div className="p-6 rounded-2xl bg-[#090D22]/90 border border-rose-500/20 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white flex items-center gap-2">
                                Downside-Risk Email Alerts
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                    Phase 3 Quantitative
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400">
                                Receive empirical email warnings when stocks on your watchlist breach verified downside risk thresholds.
                            </p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={downsideRiskAlertsEnabled}
                            onChange={(e) => setDownsideRiskAlertsEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                    </label>
                </div>

                {downsideRiskAlertsEnabled && (
                    <div className="space-y-5 border-t border-gray-800 pt-5">
                        {/* Minimum Severity Selector */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-200 block">Minimum Alert Severity</label>
                                <span className="text-xs text-gray-400">Only receive emails meeting or exceeding this threshold</span>
                            </div>
                            <select
                                value={downsideRiskMinSeverity}
                                onChange={(e) => setDownsideRiskMinSeverity(e.target.value as any)}
                                className="px-4 py-2 rounded-xl bg-[#050816] text-white border border-gray-700 focus:border-rose-400 focus:outline-none text-sm"
                            >
                                <option value="critical">Critical Only (Severe drawdown over 25%, heavy breakdown)</option>
                                <option value="warning">Warning &amp; Above (Recommended: VaR over 3.5%, 200d breakdown)</option>
                                <option value="advisory">Advisory &amp; Above (All empirical alerts including near lows)</option>
                            </select>
                        </div>

                        {/* Alert Cooldown Hours */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-800/60 pt-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-200 block">Alert Cooldown Window</label>
                                <span className="text-xs text-gray-400">Prevents repeated emails unless severity escalates</span>
                            </div>
                            <select
                                value={downsideRiskCooldownHours}
                                onChange={(e) => setDownsideRiskCooldownHours(parseInt(e.target.value, 10))}
                                className="px-4 py-2 rounded-xl bg-[#050816] text-white border border-gray-700 focus:border-rose-400 focus:outline-none text-sm"
                            >
                                <option value={12}>12 Hours</option>
                                <option value={24}>24 Hours (1 Day) - Recommended</option>
                                <option value={48}>48 Hours (2 Days)</option>
                                <option value={72}>72 Hours (3 Days)</option>
                            </select>
                        </div>

                        {/* Enabled Risk Categories */}
                        <div className="border-t border-gray-800/60 pt-4">
                            <label className="text-sm font-semibold text-gray-200 block mb-2">Monitored Risk Categories</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {[
                                    { key: 'volatility_spike', label: 'Volatility Spikes (21d Annualized & Acceleration)' },
                                    { key: 'drawdown', label: 'Substantial Historical Drawdowns (>20% drops)' },
                                    { key: 'ma_breakdown', label: 'Moving Average Breakdowns (Below 200d SMA)' },
                                    { key: 'var_exceedance', label: 'Value at Risk (Elevated 95% 1-day tail risk)' },
                                    { key: 'historical_low', label: 'Proximity to 52-Week Lows (Within 5% of low)' },
                                ].map(({ key, label }) => (
                                    <label key={key} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#050816] border border-gray-800/80 cursor-pointer hover:border-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={downsideRiskCategories[key as keyof typeof downsideRiskCategories]}
                                            onChange={(e) =>
                                                setDownsideRiskCategories({
                                                    ...downsideRiskCategories,
                                                    [key]: e.target.checked,
                                                })
                                            }
                                            className="rounded border-gray-700 text-rose-500 focus:ring-rose-400"
                                        />
                                        <span className="text-gray-300 font-medium">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
