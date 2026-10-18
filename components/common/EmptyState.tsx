'use client';

import React from 'react';
import { FolderPlus, LucideIcon } from 'lucide-react';
import Link from 'next/link';

export interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    icon?: LucideIcon;
    className?: string;
}

export function EmptyState({
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
    icon: Icon = FolderPlus,
    className = '',
}: EmptyStateProps) {
    const actionButtonClasses =
        'mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/30 shadow-lg';

    return (
        <div
            className={`rounded-2xl border border-gray-800/80 bg-gray-900/50 p-8 sm:p-12 text-center backdrop-blur-md shadow-xl ${className}`}
        >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800/80 border border-gray-750 text-emerald-400">
                <Icon className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-100">{title}</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-xs sm:text-sm text-gray-400 leading-relaxed">
                {description}
            </p>

            {actionLabel && actionHref && (
                <Link href={actionHref} className={actionButtonClasses}>
                    {actionLabel}
                </Link>
            )}

            {actionLabel && onAction && !actionHref && (
                <button onClick={onAction} className={actionButtonClasses}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
