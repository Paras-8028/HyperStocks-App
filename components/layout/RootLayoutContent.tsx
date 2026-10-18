'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

interface RootLayoutContentProps {
    children: React.ReactNode;
    footer: React.ReactNode;
}

export function RootLayoutContent({ children, footer }: RootLayoutContentProps) {
    const pathname = usePathname();
    const isAIAssistant = pathname.startsWith('/ai-assistant');

    if (isAIAssistant) {
        return (
            <div className="h-[calc(100dvh-70px)] overflow-hidden flex flex-col">
                {children}
            </div>
        );
    }

    return (
        <>
            <div className="container py-10 flex-1">
                {children}
            </div>
            {footer}
        </>
    );
}
