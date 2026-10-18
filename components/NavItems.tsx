'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchCommand from '@/components/SearchCommand';
import { BarChart3, Bookmark, Compass, LayoutDashboard, Search, Sparkles } from 'lucide-react';

interface NavItemsProps {
    initialStocks: StockWithWatchlistStatus[];
    mobile?: boolean;
    onNavigate?: () => void;
}

export default function NavItems({ initialStocks, mobile = false, onNavigate }: NavItemsProps) {
    const pathname = usePathname();

    const isOverviewActive = pathname === '/overview' || pathname === '/';
    const isExploreActive = pathname.startsWith('/stocks');
    const isWatchlistActive = pathname.startsWith('/watchlist');
    const isAIAssistantActive = pathname.startsWith('/ai-assistant');

    const navLinks = [
        {
            href: '/overview',
            label: 'Overview',
            icon: LayoutDashboard,
            active: isOverviewActive,
        },
        {
            href: '/stocks',
            label: 'Explore Stocks',
            icon: Compass,
            active: isExploreActive,
        },
        {
            href: '/watchlist',
            label: 'Watchlist',
            icon: Bookmark,
            active: isWatchlistActive,
        },
        {
            href: '/ai-assistant',
            label: 'AI Assistant',
            icon: Sparkles,
            active: isAIAssistantActive,
        },
    ];

    if (mobile) {
        return (
            <div className="flex flex-col gap-2 w-full">
                {/* Search in mobile drawer */}
                <div className="w-full pb-2 border-b border-[rgba(148,163,184,0.12)]">
                    <SearchCommand
                        renderAs="button"
                        label="Search stocks & symbols..."
                        initialStocks={initialStocks}
                    />
                </div>

                {navLinks.map(({ href, label, icon: Icon, active }) => (
                    <Link
                        key={href}
                        href={href}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-xs font-semibold transition ${
                            active
                                ? 'bg-[#111B2E] text-[#35D6FF] border border-[#35D6FF]/40 font-bold shadow-sm shadow-[#35D6FF]/10'
                                : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E]/50'
                        }`}
                    >
                        <Icon className={`h-4 w-4 ${active ? 'text-[#35D6FF]' : 'text-[#94A3B8]'}`} />
                        <span>{label}</span>
                        {href === '/ai-assistant' && (
                            <span className="ml-auto text-[10px] font-mono text-[#35D6FF] uppercase">
                                Copilot
                            </span>
                        )}
                    </Link>
                ))}
            </div>
        );
    }

    return (
        <ul className="flex items-center gap-1.5 font-medium">
            {navLinks.map(({ href, label, icon: Icon, active }) => (
                <li key={href}>
                    <Link
                        href={href}
                        className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                            active
                                ? 'bg-[#111B2E] text-[#35D6FF] shadow-[0_0_15px_rgba(53,214,255,0.12)] border border-[#35D6FF]/35 font-bold'
                                : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E]/50'
                        }`}
                    >
                        <Icon className={`h-3.5 w-3.5 ${active ? 'text-[#35D6FF]' : 'text-[#94A3B8]'}`} />
                        <span>{label}</span>
                        {active && (
                            <span className="absolute -bottom-1 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF]" />
                        )}
                    </Link>
                </li>
            ))}

            {/* Desktop Stock Search Shortcut */}
            <li className="ml-1">
                <SearchCommand
                    renderAs="text"
                    label="Search..."
                    initialStocks={initialStocks}
                />
            </li>
        </ul>
    );
}
