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
            className={`rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 text-center backdrop-blur ${className}`}
        >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-100">{title}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-400">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-700 hover:text-white"
                >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                </button>
            )}
        </div>
    );
}
