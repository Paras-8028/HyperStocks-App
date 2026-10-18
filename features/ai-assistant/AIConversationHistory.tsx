'use client';

import React from 'react';
import { MessageSquare, Plus, Trash2, Clock } from 'lucide-react';

export interface ChatSession {
    id: string;
    title: string;
    updatedAt: number;
    messageCount: number;
}

export interface AIConversationHistoryProps {
    sessions: ChatSession[];
    currentSessionId: string;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string) => void;
    className?: string;
}

export function AIConversationHistory({
    sessions,
    currentSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    className = '',
}: AIConversationHistoryProps) {
    return (
        <div className={`flex flex-col h-full bg-gray-950/80 border-r border-gray-850 p-3 space-y-3 ${className}`}>
            <button
                onClick={onNewChat}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-4 py-2.5 text-xs font-bold transition shadow-md shadow-emerald-500/20"
            >
                <Plus className="h-4 w-4" />
                New Analysis Chat
            </button>

            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 pt-2">
                Recent Research Threads
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {sessions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-600">
                        No previous research sessions yet.
                    </div>
                ) : (
                    sessions.map((sess) => {
                        const active = sess.id === currentSessionId;
                        return (
                            <div
                                key={sess.id}
                                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition cursor-pointer ${
                                    active
                                        ? 'bg-gray-850 text-emerald-400 font-semibold border border-gray-750'
                                        : 'text-gray-300 hover:bg-gray-900 hover:text-gray-100'
                                }`}
                                onClick={() => onSelectSession(sess.id)}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-emerald-400' : 'text-gray-500'}`} />
                                    <span className="truncate">{sess.title}</span>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSession(sess.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-rose-400 transition"
                                    title="Delete chat"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
