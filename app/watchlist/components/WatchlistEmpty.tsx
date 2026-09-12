'use client';

import { EmptyState } from '@/components/common/EmptyState';
import { Star } from 'lucide-react';

const WatchlistEmpty = () => {
    return (
        <div className="container max-w-2xl py-16">
            <EmptyState
                title="Your Watchlist is Empty"
                description="You are not tracking any stocks yet. Search for equities like NVDA, AAPL, or MSFT and click the star icon to start monitoring."
                actionLabel="Explore Market Leaders"
                actionHref="/"
                icon={Star}
            />
        </div>
    );
};

export default WatchlistEmpty;
