'use client';

import React from 'react';

export interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}

export function SkeletonBox({ className = '', style }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-md bg-gray-800/80 ${className}`}
            style={style}
        />
    );
}

export function MetricCardSkeleton() {
    return (
        <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-4 space-y-3 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between">
                <SkeletonBox className="h-4 w-24" />
                <SkeletonBox className="h-6 w-6 rounded-lg" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
                <SkeletonBox className="h-8 w-28" />
                <SkeletonBox className="h-5 w-14 rounded-md" />
            </div>
            <SkeletonBox className="h-3 w-36" />
        </div>
    );
}

export function AIThesisCardSkeleton() {
    return (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-6 space-y-5 backdrop-blur shadow-2xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SkeletonBox className="h-7 w-7 rounded-lg bg-emerald-500/20" />
                    <SkeletonBox className="h-5 w-48 bg-emerald-500/20" />
                </div>
                <SkeletonBox className="h-6 w-24 rounded-full bg-emerald-500/20" />
            </div>
            <SkeletonBox className="h-14 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <SkeletonBox className="h-28 w-full" />
                <SkeletonBox className="h-28 w-full" />
            </div>
        </div>
    );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
    return (
        <div className="flex items-center justify-between py-3.5 px-4 border-b border-gray-800/60 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <SkeletonBox
                    key={i}
                    className={`h-4 ${i === 0 ? 'w-28' : i === cols - 1 ? 'w-16' : 'w-20'}`}
                />
            ))}
        </div>
    );
}

export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
    return (
        <div
            className={`rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5 backdrop-blur flex flex-col justify-between ${height}`}
        >
            <div className="flex items-center justify-between mb-4">
                <SkeletonBox className="h-5 w-32" />
                <div className="flex gap-2">
                    <SkeletonBox className="h-6 w-12 rounded-lg" />
                    <SkeletonBox className="h-6 w-12 rounded-lg" />
                </div>
            </div>
            <div className="flex-1 flex items-end gap-2 px-2 pb-2">
                {Array.from({ length: 12 }).map((_, i) => (
                    <SkeletonBox
                        key={i}
                        className={`flex-1 rounded-t-sm`}
                        style={{ height: `${25 + ((i * 17) % 65)}%` }}
                    />
                ))}
            </div>
        </div>
    );
}

export function NewsCardSkeleton() {
    return (
        <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5 space-y-3 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between">
                <SkeletonBox className="h-4 w-28 rounded-md" />
                <SkeletonBox className="h-4 w-16" />
            </div>
            <SkeletonBox className="h-5 w-3/4" />
            <SkeletonBox className="h-12 w-full" />
            <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                    <SkeletonBox className="h-6 w-14 rounded-lg" />
                    <SkeletonBox className="h-6 w-20 rounded-lg" />
                </div>
                <SkeletonBox className="h-4 w-20" />
            </div>
        </div>
    );
}

export function AIInsightSkeleton() {
    return (
        <div className="rounded-2xl border border-emerald-500/20 bg-gray-900/60 p-4 space-y-2 backdrop-blur">
            <div className="flex items-center justify-between">
                <SkeletonBox className="h-4 w-32 bg-emerald-500/20" />
                <SkeletonBox className="h-4 w-16 rounded-full" />
            </div>
            <SkeletonBox className="h-8 w-full" />
        </div>
    );
}
