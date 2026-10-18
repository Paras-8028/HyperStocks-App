import React from 'react';
import type { Metadata } from 'next';
import { AIChat } from '@/features/ai-assistant/AIChat';

export const metadata: Metadata = {
    title: 'AI Financial Assistant | HyperStocks',
    description: 'Real-time AI financial intelligence copilot powered by Gemini and HyperStocks telemetry.',
};

export default function AIAssistantPage() {
    return (
        <div className="w-full max-w-6xl mx-auto h-full flex flex-col min-h-0 px-2 sm:px-4 py-2 sm:py-3">
            <AIChat
                mode="embedded"
                className="flex-1 min-h-0 w-full shadow-[0_0_50px_rgba(124,92,255,0.12)] border-[#7C5CFF]/30"
            />
        </div>
    );
}
