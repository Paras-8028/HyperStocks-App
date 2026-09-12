'use client';

import { NAV_ITEMS } from '@/lib/constants';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchCommand from '@/components/SearchCommand';

const NavItems = ({ initialStocks }: { initialStocks: StockWithWatchlistStatus[] }) => {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    };

    return (
        <ul className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 font-medium">
            {NAV_ITEMS.map(({ href, label }) => {
                if (href === '/search') {
                    return (
                        <li key="search-trigger" className="w-full sm:w-auto">
                            <SearchCommand
                                renderAs="text"
                                label="Search"
                                initialStocks={initialStocks}
                            />
                        </li>
                    );
                }

                const active = isActive(href);

                return (
                    <li key={href} className="w-full sm:w-auto">
                        <Link
                            href={href}
                            className={`relative flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                                active
                                    ? 'bg-gray-900 text-emerald-400 shadow-sm border border-emerald-500/30 font-bold'
                                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-900/50'
                            }`}
                        >
                            {label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
};

export default NavItems;
