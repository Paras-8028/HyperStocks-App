import React from 'react';
import { MarketOverviewDashboard } from '@/features/overview';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Market Overview | HyperStocks Financial Intelligence',
    description: 'Comprehensive daily view of financial markets: interactive stock heatmap, benchmark indices, sector performance, and top stories.',
};

export default function OverviewPage() {
    return (
        <div className="min-h-screen text-[#F4F7FF]">
            <main className="container mx-auto px-4 py-6 md:py-8 space-y-12">
                <MarketOverviewDashboard />
            </main>
        </div>
    );
}
