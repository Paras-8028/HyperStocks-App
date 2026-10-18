'use client';

import React from 'react';
import { UserButton, useUser } from '@clerk/nextjs';

interface UserDropdownProps {
    user?: {
        id?: string;
        name?: string;
        email?: string;
    };
    initialStocks?: StockWithWatchlistStatus[];
}

const UserDropdown = ({ user: propUser }: UserDropdownProps) => {
    const { user } = useUser();

    // Determine clean display name: Full Name -> First + Last -> First -> Username -> Prop Name -> Fallback
    const displayName =
        user?.fullName?.trim() ||
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
        user?.firstName?.trim() ||
        user?.username?.trim() ||
        propUser?.name?.trim() ||
        'My Account';

    return (
        <div className="flex items-center gap-2 sm:gap-2.5">
            <UserButton
                appearance={{
                    elements: {
                        userButtonAvatarBox:
                            'h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-[#35D6FF]/35 hover:ring-[#35D6FF]/70 transition-all shadow-md rounded-full',
                        userButtonPopoverCard:
                            'border border-[rgba(148,163,184,0.18)] bg-[#0A101D] text-[#F4F7FF] shadow-2xl backdrop-blur-2xl rounded-2xl',
                        userButtonPopoverActionButton:
                            'text-[#94A3B8] hover:text-[#35D6FF] hover:bg-[#111B2E]/70 transition-colors',
                        userButtonPopoverActionButtonText:
                            'text-[#E2E8F0] text-xs font-medium',
                        userButtonPopoverFooter:
                            'border-t border-[rgba(148,163,184,0.14)]',
                    },
                }}
            />
            <div className="hidden sm:flex flex-col text-left leading-tight select-none">
                <span
                    className="text-xs font-semibold text-[#F4F7FF] truncate max-w-[100px] md:max-w-[125px] xl:max-w-[150px] transition-colors"
                    title={displayName}
                >
                    {displayName}
                </span>
                <span className="text-[10px] text-[#94A3B8] font-medium tracking-wide">
                    Account
                </span>
            </div>
        </div>
    );
};

export default UserDropdown;
