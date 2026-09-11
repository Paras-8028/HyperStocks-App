'use client';

import React from 'react';

export interface SkeletonProps {
    className?: string;
}

export function SkeletonBox({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-md bg-gray-800/80 ${className}`}
        />
    );
}

export function MetricCardSkeleton() {
    return (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-3 backdrop-blur">
            <div className="flex items-center justify-between">
                <SkeletonBox className="h-4 w-24" />
                <SkeletonBox className="h-4 w-12 rounded-full" />
            </div>
            <SkeletonBox className="h-7 w-32" />
            <SkeletonBox className="h-3 w-40" />
        </div>
    );
}

export function AIThesisCardSkeleton() {
    return (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-6 space-y-5 backdrop-blur">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SkeletonBox className="h-6 w-6 rounded-full bg-emerald-500/20" />
                    <SkeletonBox className="h-5 w-48 bg-emerald-500/20" />
                </div>
                <SkeletonBox className="h-6 w-20 rounded-full bg-emerald-500/20" />
            </div>
            <SkeletonBox className="h-16 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <SkeletonBox className="h-28 w-full" />
                <SkeletonBox className="h-28 w-full" />
            </div>
        </div>
    );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
    return (
        <div className="flex items-center justify-between py-3 px-4 border-b border-gray-800/60 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <SkeletonBox
                    key={i}
                    className={`h-4 ${i === 0 ? 'w-28' : i === cols - 1 ? 'w-16' : 'w-20'}`}
                />
            ))}
        </div>
    );
}
