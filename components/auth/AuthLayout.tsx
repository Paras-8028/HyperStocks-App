'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AuthBackground } from './AuthBackground';
import { AuthBrandPanel } from './AuthBrandPanel';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    mode?: 'sign-in' | 'sign-up';
}

export function AuthLayout({ children, mode = 'sign-in' }: AuthLayoutProps) {
    const isSignIn = mode === 'sign-in';

    return (
        <main className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden bg-gray-950">
            {/* Ambient Financial & Grid Backdrop */}
            <AuthBackground />

            {/* Two-Panel Glassmorphic Authentication Shell */}
            <div className="relative w-full max-w-6xl mx-auto rounded-3xl border border-gray-800/80 bg-gray-950/70 shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden flex flex-col lg:flex-row min-h-[640px]">
                {/* Left Brand Panel (Desktop & Tablet) */}
                <div className="hidden lg:flex lg:w-[52%] border-r border-gray-800/70 bg-gradient-to-b from-gray-900/40 via-gray-950/60 to-gray-950/90 relative">
                    <AuthBrandPanel mode={mode} />
                </div>

                {/* Right Authentication Form Panel */}
                <div className="w-full lg:w-[48%] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative">
                    {/* Mobile Brand Header (Visible only when left panel is hidden) */}
                    <div className="lg:hidden w-full flex items-center justify-between mb-8">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/assets/icons/L1.png"
                                alt="HyperStocks logo"
                                width={135}
                                height={30}
                                className="h-7 w-auto cursor-pointer"
                                priority
                            />
                        </Link>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                            <Sparkles className="h-3 w-3 text-emerald-400" />
                            <span>AI Platform</span>
                        </div>
                    </div>

                    {/* Authentication Card Inner Wrapper */}
                    <div className="w-full max-w-md flex flex-col items-center">
                        {/* Status Header */}
                        <div className="w-full mb-5 text-center lg:text-left space-y-1">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                {isSignIn ? 'Secure Member Access' : 'New Investor Registration'}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
                                {isSignIn ? 'Welcome back' : 'Create your account'}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-400">
                                {isSignIn
                                    ? 'Sign in to access your portfolio and market intelligence.'
                                    : 'Start analyzing the markets with institutional-grade AI.'}
                            </p>
                        </div>

                        {/* Clerk Authentication Component Mount Point */}
                        <div className="w-full">
                            {children}
                        </div>

                        {/* Security Footer Notice */}
                        <div className="mt-8 pt-4 border-t border-gray-850 w-full flex items-center justify-center gap-2 text-[11px] text-gray-500">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80 shrink-0" />
                            <span>Encrypted Institutional Authentication • SOC2 Type II Certified</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
