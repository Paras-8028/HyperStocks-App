'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({
    title = 'Unable to Load Financial Data',
    message = 'An unexpected error occurred while communicating with the intelligence service. Please verify your connection or try again.',
    onRetry,
    className = '',
}: ErrorStateProps) {
    return (
        <div
            className={`orbital-card border border-[#FF5470]/30 bg-[#FF5470]/5 p-6 text-center backdrop-blur ${className}`}
        >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5470]/10 text-[#FF5470] border border-[#FF5470]/20">
                <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-[#F4F7FF]">{title}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#94A3B8]">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-4 orbital-btn-secondary inline-flex items-center gap-2 text-xs font-semibold px-4 py-2"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry Telemetry
                </button>
            )}
        </div>
    );
}
