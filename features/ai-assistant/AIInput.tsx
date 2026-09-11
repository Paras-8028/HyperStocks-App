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
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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
        <div className={`relative rounded-2xl border border-gray-800 bg-gray-900/90 backdrop-blur p-2.5 shadow-xl transition-all focus-within:border-emerald-500/50 ${className}`}>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className="w-full resize-none bg-transparent px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none max-h-32 disabled:opacity-50 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2 px-2 border-t border-gray-800/60 text-[11px] text-gray-500">
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                        <kbd className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">Enter</kbd> to send
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <kbd className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">Shift+Enter</kbd> newline
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {loading ? (
                        <button
                            type="button"
                            onClick={onStop}
                            className="flex items-center gap-1 rounded-xl bg-gray-800 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-gray-750 transition"
                            title="Stop generating"
                        >
                            <Square className="h-3 w-3 fill-rose-400" />
                            Stop
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!value.trim() || disabled}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500 text-gray-950 transition hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
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
