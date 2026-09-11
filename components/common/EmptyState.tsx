'use client';

import React from 'react';
import { FolderPlus, LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: LucideIcon;
    className?: string;
}

export function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
    icon: Icon = FolderPlus,
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`rounded-xl border border-gray-800/80 bg-gray-900/40 p-8 text-center backdrop-blur ${className}`}
        >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800/60 text-gray-400">
                <Icon className="h-7 w-7 text-emerald-400/80" />
            </div>
            <h3 className="text-lg font-medium text-gray-100">{title}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400">{description}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
