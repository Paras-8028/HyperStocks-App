'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowUp, CornerDownLeft, Sparkles, Square } from 'lucide-react';

export interface AIInputProps {
    value: string;
    onChange: (val: string) => void;
    onSubmit: () => void;
    onStop?: () => void;
    loading?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function AIInput({
    value,
    onChange,
    onSubmit,
    onStop,
    loading = false,
    placeholder = 'Ask anything about stocks, valuation, portfolio risks, or macro...',
    disabled = false,
    className = '',
}: AIInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Auto resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
        }
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!loading && value.trim()) {
                onSubmit();
            }
        }
    };

    return (
        <div className={`relative rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[#080D1B]/95 backdrop-blur p-2 sm:p-2.5 shadow-xl transition-all focus-within:border-[#7C5CFF]/60 ${className}`}>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className="w-full resize-none bg-transparent px-2.5 py-1 text-xs text-[#F4F7FF] placeholder-[#94A3B8]/60 focus:outline-none max-h-24 disabled:opacity-50 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1.5 px-1 border-t border-[rgba(148,163,184,0.1)] text-[11px] text-[#94A3B8]">
                <div className="hidden sm:flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1">
                        <kbd className="rounded bg-[#111B2E] px-1 py-0.5 font-mono text-[9px] text-[#CBD5E1]">Enter</kbd> to send
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <kbd className="rounded bg-[#111B2E] px-1 py-0.5 font-mono text-[9px] text-[#CBD5E1]">Shift+Enter</kbd> newline
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {loading ? (
                        <button
                            type="button"
                            onClick={onStop}
                            className="flex items-center gap-1 rounded-xl bg-[#111B2E] px-3 py-1.5 text-xs font-semibold text-[#FF5470] hover:bg-[#17243B] transition"
                            title="Stop generating"
                        >
                            <Square className="h-3 w-3 fill-[#FF5470]" />
                            Stop
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!value.trim() || disabled}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-[#050816] transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#7C5CFF]/25 font-bold"
                            title="Send message"
                        >
                            <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
