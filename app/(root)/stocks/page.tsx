import React from 'react';
import Link from 'next/link';
import SearchCommand from '@/components/SearchCommand';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import { Compass, Flame, Search, TrendingUp, Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Explore Stocks | HyperStocks Financial Intelligence',
    description: 'Discover stocks, explore market categories, and analyze global equities with HyperStocks.',
};

const DISCOVERY_CATEGORIES = [
    {
        name: 'Mega-Cap Leaders',
        description: 'World-leading enterprise platforms and cloud giants',
        symbols: [
            { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
            { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
            { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductors' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
        ],
    },
    {
        name: 'Financial Sovereignty',
        description: 'Money center banks, global payment networks & credit',
        symbols: [
            { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Banking' },
            { symbol: 'V', name: 'Visa Inc.', sector: 'Payments' },
            { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Payments' },
            { symbol: 'BAC', name: 'Bank of America', sector: 'Banking' },
            { symbol: 'GS', name: 'Goldman Sachs', sector: 'Investment Banking' },
        ],
    },
    {
        name: 'Healthcare & Biotech',
        description: 'Pharmaceutical breakthroughs, oncology & managed care',
        symbols: [
            { symbol: 'LLY', name: 'Eli Lilly & Co.', sector: 'Biotech' },
            { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Managed Care' },
            { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Pharmaceuticals' },
            { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Biopharmaceuticals' },
            { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Pharmaceuticals' },
        ],
    },
    {
        name: 'Energy & Infrastructure',
        description: 'Global energy majors and industrial equipment',
        symbols: [
            { symbol: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Integrated Oil' },
            { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Integrated Oil' },
            { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Heavy Machinery' },
            { symbol: 'GE', name: 'GE Aerospace', sector: 'Aviation' },
            { symbol: 'COP', name: 'ConocoPhillips', sector: 'Exploration' },
        ],
    },
];

export default async function ExploreStocksPage() {
    let initialStocks: StockWithWatchlistStatus[] = [];
    try {
        initialStocks = await searchStocks();
    } catch {
        initialStocks = [];
    }

    return (
        <div className="min-h-screen text-[#F4F7FF]">
            <main className="container mx-auto px-4 py-6 md:py-10 space-y-10">
                {/* Header & Search */}
                <div className="relative rounded-3xl orbital-card p-6 md:p-10 border border-[rgba(124,92,255,0.22)] shadow-[0_0_35px_rgba(124,92,255,0.06)] space-y-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full border border-[rgba(53,214,255,0.3)] bg-[#050816]/70 text-[#35D6FF] text-xs font-mono font-semibold">
                            <Compass className="h-3.5 w-3.5 text-[#35D6FF]" />
                            <span>STOCK DISCOVERY ENGINE</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#F4F7FF]">
                            Explore{' '}
                            <span className="bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] bg-clip-text text-transparent">
                                Stocks & Equities
                            </span>
                        </h1>
                        <p className="text-xs md:text-sm text-[#94A3B8]">
                            Search across thousands of global securities, benchmark ETFs, and market sectors.
                        </p>
                    </div>

                    {/* Prominent Search Bar */}
                    <div className="max-w-xl">
                        <SearchCommand
                            renderAs="button"
                            label="Search ticker, company or ETF (e.g. AAPL, NVDA, SPY)..."
                            initialStocks={initialStocks}
                        />
                    </div>
                </div>

                {/* Curated Market Discovery Categories */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-[#F4F7FF] flex items-center gap-2">
                            <Flame className="h-4 w-4 text-[#7C5CFF]" />
                            <span>Curated Industry Tiers</span>
                        </h2>
                        <span className="text-xs text-[#94A3B8] font-mono">
                            Institutional Coverage
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {DISCOVERY_CATEGORIES.map((cat) => (
                            <div
                                key={cat.name}
                                className="orbital-card p-5 space-y-4 border border-[rgba(148,163,184,0.14)]"
                            >
                                <div>
                                    <h3 className="text-sm font-bold text-[#F4F7FF]">{cat.name}</h3>
                                    <p className="text-xs text-[#94A3B8]">{cat.description}</p>
                                </div>

                                <div className="divide-y divide-[rgba(148,163,184,0.08)]">
                                    {cat.symbols.map((item) => (
                                        <Link
                                            key={item.symbol}
                                            href={`/stocks/${item.symbol}`}
                                            className="py-2.5 flex items-center justify-between hover:bg-[#111B2E]/50 px-2 rounded-xl transition group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-bold text-sm text-[#35D6FF] group-hover:text-[#7C5CFF] transition-colors">
                                                    ${item.symbol}
                                                </span>
                                                <span className="text-xs text-[#F4F7FF]">{item.name}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-[#94A3B8] bg-[#050816]/70 px-2 py-0.5 rounded border border-[rgba(148,163,184,0.1)]">
                                                {item.sector}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
