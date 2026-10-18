'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MarketOverviewPayload } from './types';
import { OverviewHeader } from './OverviewHeader';
import { MarketOverviewCards } from './MarketOverviewCards';
import { StockHeatmap } from './StockHeatmap';
import { MajorMarketQuotes } from './MajorMarketQuotes';
import { SectorIndices } from './SectorIndices';
import { TopStories } from './TopStories';
import { ErrorState } from '@/components/common/ErrorState';
import { Loader2 } from 'lucide-react';

interface MarketOverviewDashboardProps {
    initialData?: MarketOverviewPayload | null;
}

export function MarketOverviewDashboard({ initialData }: MarketOverviewDashboardProps) {
    const [data, setData] = useState<MarketOverviewPayload | null>(initialData || null);
    const [loading, setLoading] = useState<boolean>(!initialData);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOverview = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        try {
            const res = await fetch('/api/market-overview', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to retrieve market telemetry');
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
                setError(null);
            } else {
                throw new Error(json.error || 'Invalid payload received');
            }
        } catch (err: any) {
            setError(err?.message || 'Error communicating with market overview provider');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!initialData) {
            fetchOverview();
        }
    }, [initialData, fetchOverview]);

    if (loading && !data) {
        return (
            <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 text-[#35D6FF] animate-spin" />
                <div className="text-xs font-mono text-[#94A3B8]">
                    Loading market overview telemetry...
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <ErrorState
                title="Market Overview Unavailable"
                message={error}
                onRetry={() => fetchOverview(true)}
            />
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* 1. Overview Header & Market Status */}
            <section id="overview-header">
                <OverviewHeader
                    marketStatus={data.marketStatus}
                    lastUpdated={data.lastUpdated}
                    onRefresh={() => fetchOverview(true)}
                    isRefreshing={refreshing}
                />
            </section>

            {/* 2. Market Overview Index Cards */}
            <section id="market-indices">
                <MarketOverviewCards indices={data.indices} />
            </section>

            {/* 3. Stock Heatmap */}
            <section id="stock-heatmap">
                <StockHeatmap stocks={data.heatmap} />
            </section>

            {/* 4. Major Market Quotes & Sector Indices */}
            <section id="major-quotes-and-sectors" className="space-y-8">
                <div className="grid grid-cols-1 gap-8">
                    <MajorMarketQuotes quotes={data.majorQuotes} />
                    <SectorIndices sectors={data.sectors} />
                </div>
            </section>

            {/* 5. Top Stories */}
            <section id="top-stories">
                <TopStories stories={data.topStories} />
            </section>
        </div>
    );
}
