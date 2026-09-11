'use client';

import React from 'react';
import { AIChat } from './AIChat';
import { CopilotContext } from '@/types/ai';

export interface AIAssistantChatProps {
    context?: CopilotContext;
    collapsible?: boolean;
    className?: string;
}

export function AIAssistantChat({
    context,
    collapsible = false,
    className = '',
}: AIAssistantChatProps) {
    return (
        <AIChat
            currentSymbol={context?.currentSymbol}
            mode={collapsible ? 'drawer' : 'embedded'}
            className={className}
        />
    );
}
