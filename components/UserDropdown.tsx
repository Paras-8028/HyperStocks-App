'use client';

import { UserButton, useUser } from "@clerk/nextjs";

const UserDropdown = ({ initialStocks: _initialStocks }: { user?: any; initialStocks?: StockWithWatchlistStatus[] }) => {
    const { user } = useUser();

    return (
        <div className="flex items-center gap-2.5">
            <UserButton
                appearance={{
                    elements: {
                        userButtonAvatarBox: "h-9 w-9 ring-2 ring-emerald-500/30 hover:ring-emerald-500/60 transition-all shadow-md",
                        userButtonPopoverCard: "border border-gray-800 bg-gray-950 text-gray-100 shadow-2xl backdrop-blur-xl",
                        userButtonPopoverActionButton: "text-gray-300 hover:text-emerald-400 hover:bg-gray-900",
                        userButtonPopoverActionButtonText: "text-gray-200 text-sm font-medium",
                        userButtonPopoverFooter: "border-t border-gray-800",
                    },
                }}
            />
            {user && (
                <div className="hidden lg:flex flex-col text-left text-xs leading-tight">
                    <span className="font-semibold text-gray-200 truncate max-w-[130px]">
                        {user.fullName || user.firstName || 'Investor'}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate max-w-[130px]">
                        {user.primaryEmailAddress?.emailAddress}
                    </span>
                </div>
            )}
        </div>
    );
};

export default UserDropdown;
