'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import NavItems from '@/components/NavItems';
import UserDropdown from '@/components/UserDropdown';
import { SmartAlertCenter } from '@/features/alerts';
import { Show } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface HeaderClientProps {
    user?: any;
    initialStocks: StockWithWatchlistStatus[];
}

export function HeaderClient({ user, initialStocks }: HeaderClientProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    // Automatically close mobile menu upon route navigation
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-50 w-full h-[70px] bg-[#050816]/85 backdrop-blur-xl border-b border-[rgba(148,163,184,0.14)] transition-all">
            <div className="container flex justify-between items-center h-full px-4 sm:px-6">
                {/* Brand Logo & Live Status Indicator */}
                <Link href="/overview" className="flex items-center gap-2.5 group">
                    <Image
                        src="/assets/icons/L1.png"
                        alt="HyperStocks logo"
                        width={135}
                        height={32}
                        priority
                        className="h-9 w-auto cursor-pointer transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-[#7C5CFF]/15 to-[#35D6FF]/15 text-[#35D6FF] border border-[#35D6FF]/30 shadow-[0_0_12px_rgba(53,214,255,0.15)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3DFFA0] animate-pulse"></span>
                        LIVE
                    </span>
                </Link>

                {/* Signed-In Navigation */}
                <Show when="signed-in">
                    {/* Desktop Navigation */}
                    <nav className="hidden lg:block">
                        <NavItems initialStocks={initialStocks} />
                    </nav>

                    {/* Right Controls: Alerts, User Profile, Mobile Hamburger */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SmartAlertCenter />
                        <UserDropdown user={user} initialStocks={initialStocks} />

                        {/* Mobile Menu Hamburger Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 rounded-xl border border-[rgba(148,163,184,0.15)] bg-[#111B2E] text-[#94A3B8] hover:text-[#F4F7FF] transition-colors"
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </Show>

                {/* Signed-Out Navigation */}
                <Show when="signed-out">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/sign-in"
                            className="text-xs font-semibold text-[#94A3B8] hover:text-[#F4F7FF] transition-colors px-3 py-1.5"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/sign-up"
                            className="text-xs font-semibold bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] hover:brightness-110 text-[#050816] px-4 py-2 rounded-xl shadow-lg shadow-[#7C5CFF]/25 transition-all font-bold"
                        >
                            Get Started
                        </Link>
                    </div>
                </Show>
            </div>

            {/* Mobile Navigation Drawer */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-x-0 top-[70px] bg-[#050816]/95 backdrop-blur-2xl border-b border-[rgba(148,163,184,0.18)] p-5 shadow-2xl animate-in slide-in-from-top-2 duration-200 z-50">
                    <NavItems
                        initialStocks={initialStocks}
                        mobile
                        onNavigate={() => setMobileMenuOpen(false)}
                    />
                </div>
            )}
        </header>
    );
}
