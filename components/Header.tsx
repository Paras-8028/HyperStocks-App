import React from 'react';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import { HeaderClient } from '@/components/HeaderClient';

const Header = async ({ user }: { user?: any }) => {
    let initialStocks: StockWithWatchlistStatus[] = [];
    try {
        initialStocks = await searchStocks();
    } catch {
        initialStocks = [];
    }

    return <HeaderClient user={user} initialStocks={initialStocks} />;
};

export default Header;
