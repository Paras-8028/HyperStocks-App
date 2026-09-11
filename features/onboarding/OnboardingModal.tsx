'use client';

import React, { useState } from 'react';
import { usePersonalization } from '@/context/PersonalizationContext';
import {
    AnalysisStyle,
    InvestmentExperience,
    InvestmentGoal,
    InvestmentHorizon,
    RiskTolerance,
} from '@/types/personalization';
import {
    Activity,
    ArrowRight,
    Award,
    BarChart2,
    Check,
    ChevronRight,
    Compass,
    Cpu,
    Flame,
    HeartPulse,
    Landmark,
    Layers,
    PieChart,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingUp,
    X,
    Zap,
} from 'lucide-react';

const SECTORS = [
    { id: 'Technology', label: 'Technology & AI', icon: Cpu },
    { id: 'Healthcare', label: 'Healthcare & Biotech', icon: HeartPulse },
    { id: 'Financials', label: 'Financials & Banking', icon: Landmark },
    { id: 'Consumer Discretionary', label: 'Consumer & Retail', icon: Layers },
    { id: 'Energy', label: 'Energy & Renewables', icon: Flame },
    { id: 'Industrials', label: 'Industrials & Defense', icon: Target },
];

const POPULAR_STOCKS = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'LLY', 'JPM', 'PLTR', 'AMD', 'GOOGL'];

export function OnboardingModal() {
    const { preferences, updatePreferences, isOnboardingOpen, closeOnboarding } = usePersonalization();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Form state initialized from current preferences
    const [experience, setExperience] = useState<InvestmentExperience>(
        preferences.experienceLevel || 'intermediate'
    );
    const [horizon, setHorizon] = useState<InvestmentHorizon>(
        preferences.investmentHorizon || 'medium_term'
    );
    const [goals, setGoals] = useState<InvestmentGoal[]>(
        Array.isArray(preferences.investmentGoals)
            ? (preferences.investmentGoals as InvestmentGoal[])
            : [(preferences.investmentGoals || 'growth') as InvestmentGoal]
    );
    const [risk, setRisk] = useState<RiskTolerance>(preferences.riskTolerance || 'moderate');
    const [sectors, setSectors] = useState<string[]>(
        preferences.preferredSectors && preferences.preferredSectors.length > 0
            ? preferences.preferredSectors
            : ['Technology', 'Healthcare', 'Financials']
    );
    const [style, setStyle] = useState<AnalysisStyle>(
        preferences.preferredAnalysisStyle || 'balanced'
    );
    const [favorites, setFavorites] = useState<string[]>(
        preferences.favoriteStocks && preferences.favoriteStocks.length > 0
            ? preferences.favoriteStocks
            : ['AAPL', 'NVDA', 'MSFT']
    );

    if (!isOnboardingOpen) return null;

    const toggleGoal = (g: InvestmentGoal) => {
        setGoals((prev) =>
            prev.includes(g) ? (prev.length > 1 ? prev.filter((x) => x !== g) : prev) : [...prev, g]
        );
    };

    const toggleSector = (sec: string) => {
        setSectors((prev) =>
            prev.includes(sec) ? (prev.length > 1 ? prev.filter((x) => x !== sec) : prev) : [...prev, sec]
        );
    };

    const toggleFavorite = (sym: string) => {
        setFavorites((prev) =>
            prev.includes(sym) ? prev.filter((x) => x !== sym) : [...prev, sym]
        );
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            await updatePreferences({
                experienceLevel: experience,
                investmentHorizon: horizon,
                investmentGoals: goals,
                riskTolerance: risk,
                preferredSectors: sectors,
                preferredAnalysisStyle: style,
                favoriteStocks: favorites,
                onboardingCompleted: true,
            });
            closeOnboarding();
        } catch (err) {
            console.error('Failed to save preferences:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-6 sm:p-8 shadow-2xl shadow-emerald-950/40 text-gray-100 space-y-6">
                {/* Close button */}
                <button
                    onClick={closeOnboarding}
                    className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Header & Steps Progress */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        HyperStocks Intelligence Engine Setup
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400">Step {step} of 4</span>
                    </div>

                    <h2 className="text-2xl font-extrabold text-gray-100">
                        {step === 1 && 'Define Your Investor Profile'}
                        {step === 2 && 'Set Investment Goals & Risk Tolerance'}
                        {step === 3 && 'Tailor Sectors & Analysis Style'}
                        {step === 4 && 'Curate Your Primary Watchlist'}
                    </h2>
                    <p className="text-xs text-gray-400">
                        {step === 1 && 'HyperStocks adapts its dashboard insights and AI copilot tone to your background.'}
                        {step === 2 && 'Guides our recommendation algorithms and risk radar sensitivity.'}
                        {step === 3 && 'Prioritizes relevant market intelligence, SEC filings, and indicator setups.'}
                        {step === 4 && 'Select foundational assets to ground your real-time morning briefing.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${(step / 4) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Step Content */}
                <div className="min-h-[280px]">
                    {/* STEP 1: Experience & Horizon */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                                    Investment Experience
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {[
                                        { id: 'beginner', label: 'Beginner', desc: 'Plain English' },
                                        { id: 'intermediate', label: 'Intermediate', desc: 'Standard Metrics' },
                                        { id: 'advanced', label: 'Advanced', desc: 'Multi-factor' },
                                        { id: 'institutional', label: 'Institutional', desc: 'Quant & Flow' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setExperience(opt.id as InvestmentExperience)}
                                            className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                                                experience === opt.id
                                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                                                    : 'border-gray-800 bg-gray-850/40 text-gray-300 hover:border-gray-700'
                                            }`}
                                        >
                                            <span className="font-bold text-xs">{opt.label}</span>
                                            <span className="text-[10px] text-gray-400 mt-1">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                                    Investment Horizon
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {[
                                        { id: 'short_term', label: 'Short Term (< 6 Mo)', desc: 'Tactical & Momentum' },
                                        { id: 'medium_term', label: 'Medium Term (6–24 Mo)', desc: 'Cyclical & Earnings' },
                                        { id: 'long_term', label: 'Long Term (2+ Yrs)', desc: 'Secular Compounders' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setHorizon(opt.id as InvestmentHorizon)}
                                            className={`p-3 rounded-2xl border text-left transition ${
                                                horizon === opt.id
                                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                                                    : 'border-gray-800 bg-gray-850/40 text-gray-300 hover:border-gray-700'
                                            }`}
                                        >
                                            <div className="font-bold text-xs">{opt.label}</div>
                                            <div className="text-[10px] text-gray-400">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Goals & Risk */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                                    Primary Investment Goals (Select all that apply)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {[
                                        { id: 'growth', label: 'Capital Growth', icon: TrendingUp },
                                        { id: 'income', label: 'Dividend Income', icon: Landmark },
                                        { id: 'capital_preservation', label: 'Preservation', icon: ShieldCheck },
                                        { id: 'balanced', label: 'Balanced Total Return', icon: PieChart },
                                        { id: 'speculation', label: 'Momentum / Speculation', icon: Zap },
                                    ].map((opt) => {
                                        const selected = goals.includes(opt.id as InvestmentGoal);
                                        const Icon = opt.icon;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => toggleGoal(opt.id as InvestmentGoal)}
                                                className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                                                    selected
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                                                        : 'border-gray-800 bg-gray-850/40 text-gray-300 hover:border-gray-700'
                                                }`}
                                            >
                                                <Icon className={`h-4 w-4 ${selected ? 'text-emerald-400' : 'text-gray-400'}`} />
                                                <span className="font-bold text-xs">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                                    Risk Tolerance Profile
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {[
                                        { id: 'conservative', label: 'Conservative', desc: 'Heavy risk warnings, low beta', icon: Shield },
                                        { id: 'moderate', label: 'Moderate', desc: 'Balanced risk vs return radar', icon: Activity },
                                        { id: 'aggressive', label: 'Aggressive', desc: 'High beta, upside catalyst focus', icon: Flame },
                                    ].map((opt) => {
                                        const selected = risk === opt.id;
                                        const Icon = opt.icon;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setRisk(opt.id as RiskTolerance)}
                                                className={`p-3.5 rounded-2xl border text-left transition ${
                                                    selected
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                                                        : 'border-gray-800 bg-gray-850/40 text-gray-300 hover:border-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 font-bold text-xs">
                                                    <Icon className="h-4 w-4 text-emerald-400" />
                                                    {opt.label}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-1">{opt.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Sectors & Analysis Style */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                                    Preferred Market Sectors
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {SECTORS.map((sec) => {
                                        const selected = sectors.includes(sec.id);
                                        const Icon = sec.icon;
                                        return (
                                            <button
                                                key={sec.id}
                                                type="button"
                                                onClick={() => toggleSector(sec.id)}
                                                className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                                                    selected
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                                        : 'border-gray-800 bg-gray-850/40 text-gray-300 hover:border-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`h-4 w-4 ${selected ? 'text-emerald-400' : 'text-gray-400'}`} />
                                                    <span className="font-bold text-xs">{sec.label}</span>
                                                </div>
                                                {selected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                                    Preferred Analysis Style
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {[
                                        { id: 'fundamental', label: 'Fundamental', desc: 'Earnings & Valuation' },
                                        { id: 'technical', label: 'Technical', desc: 'RSI, DMA & Patterns' },
                                        { id: 'quantitative', label: 'Quantitative', desc: 'Volume & Order Flow' },
                                        { id: 'balanced', label: 'Balanced', desc: 'Multi-discipline' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setStyle(opt.id as AnalysisStyle)}
                                            className={`p-3 rounded-2xl border text-left transition ${
                                                style === opt.id
                                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                                                    : 'border-gray-800 bg-gray-850/40 text-gray-300 hover:border-gray-700'
                                            }`}
                                        >
                                            <div className="font-bold text-xs">{opt.label}</div>
                                            <div className="text-[10px] text-gray-400">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Favorite Stocks */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                                    Select Your Core Tickers
                                </label>
                                <p className="text-xs text-gray-400 mb-4">
                                    We use these symbols to personalize your immediate AI brief, alert thresholds, and news stream.
                                </p>
                                <div className="flex flex-wrap gap-2.5">
                                    {POPULAR_STOCKS.map((sym) => {
                                        const selected = favorites.includes(sym);
                                        return (
                                            <button
                                                key={sym}
                                                type="button"
                                                onClick={() => toggleFavorite(sym)}
                                                className={`px-4 py-2.5 rounded-2xl border font-mono font-bold text-xs transition flex items-center gap-2 ${
                                                    selected
                                                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                                                        : 'border-gray-800 bg-gray-850/60 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                                                }`}
                                            >
                                                <span>${sym}</span>
                                                {selected && <Check className="h-3 w-3 text-emerald-400" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-gray-300 space-y-1">
                                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Active Engine Tuning Ready
                                </div>
                                <p className="text-gray-400 leading-relaxed text-[11px]">
                                    Your HyperStocks operating system will immediately prioritize {sectors.join(', ')} insights, apply a {risk} risk filter, and tailor AI responses in a {style} style.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-850">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep((s) => s - 1)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition"
                        >
                            Back
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={closeOnboarding}
                            className="text-xs text-gray-500 hover:text-gray-300 transition"
                        >
                            Use Default Settings
                        </button>
                    )}

                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={() => setStep((s) => s + 1)}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 text-gray-950 font-bold text-xs hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
                        >
                            Next Step
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleComplete}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-gray-950 font-extrabold text-xs hover:opacity-95 transition shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                        >
                            <Sparkles className="h-4 w-4" />
                            {saving ? 'Activating Engine...' : 'Complete & Personalize'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
