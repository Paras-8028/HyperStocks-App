"use client";

import { useEffect, useState } from "react";
import {
    CommandDialog,
    CommandEmpty,
    CommandInput,
    CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { useDebounce } from "@/hooks/useDebounce";
import WatchlistButton from "@/components/WatchlistButton";
import { toggleWatchlist } from "@/lib/actions/watchlist.actions";
import { toast } from "sonner";

export default function SearchCommand({
                                          renderAs = "button",
                                          label = "Add stock",
                                          initialStocks,
                                      }: SearchCommandProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [stocks, setStocks] =
        useState<StockWithWatchlistStatus[]>(initialStocks);

    const isSearchMode = !!searchTerm.trim();
    const displayStocks = isSearchMode
        ? stocks
        : stocks.slice(0, 10);

    /* ⌘K shortcut */
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((v) => !v);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    /* Search */
    const handleSearch = async () => {
        if (!isSearchMode) {
            setStocks(initialStocks);
            return;
        }

        setLoading(true);
        try {
            const results = await searchStocks(searchTerm.trim());
            setStocks(results);
        } catch {
            setStocks([]);
        } finally {
            setLoading(false);
        }
    };

    const debouncedSearch = useDebounce(handleSearch, 300);

    useEffect(() => {
        debouncedSearch();
    }, [searchTerm]);

    const handleSelectStock = () => {
        setOpen(false);
        setSearchTerm("");
        setStocks(initialStocks);
    };

    /* ⭐ Toggle Watchlist (single source of truth) */
    const handleToggleWatchlist = async (
        symbol: string,
        company: string
    ) => {
        // Optimistic UI
        setStocks((prev) =>
            prev.map((s) =>
                s.symbol === symbol
                    ? { ...s, isInWatchlist: !s.isInWatchlist }
                    : s
            )
        );

        try {
            await toggleWatchlist(symbol, company);
        } catch (e: any) {
            // Rollback
            setStocks((prev) =>
                prev.map((s) =>
                    s.symbol === symbol
                        ? { ...s, isInWatchlist: !s.isInWatchlist }
                        : s
                )
            );

            toast.error(
                e?.message || "Failed to update watchlist"
            );
        }
    };

    return (
        <>
            {renderAs === "text" ? (
                <span
                    onClick={() => setOpen(true)}
                    className="font-medium cursor-pointer transition-colors hover:text-yellow-500"
                >
                    {label}
                </span>
            ) : (
                <Button onClick={() => setOpen(true)} className="search-btn">
                    {label}
                </Button>
            )}

            <CommandDialog
                open={open}
                onOpenChange={setOpen}
                className="search-dialog"
            >
                <div className="search-field">
                    <CommandInput
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        placeholder="Search stocks..."
                        className="search-input"
                    />
                    {loading && <Loader2 className="search-loader" />}
                </div>

                <CommandList className="search-list">
                    {loading ? (
                        <CommandEmpty>
                            Loading stocks...
                        </CommandEmpty>
                    ) : displayStocks.length === 0 ? (
                        <div className="search-list-indicator">
                            {isSearchMode
                                ? "No results found"
                                : "No stocks available"}
                        </div>
                    ) : (
                        <ul>
                            <div className="search-count">
                                {isSearchMode
                                    ? "Search results"
                                    : "Popular stocks"}{" "}
                                ({displayStocks.length})
                            </div>

                            {displayStocks.map((stock) => (
                                <li
                                    key={stock.symbol}
                                    className="search-item flex items-center justify-between gap-3"
                                >
                                    <Link
                                        href={`/stocks/${stock.symbol}`}
                                        onClick={handleSelectStock}
                                        className="search-item-link flex items-center gap-3 flex-1"
                                    >
                                        <TrendingUp className="h-4 w-4 text-gray-500" />
                                        <div className="flex-1">
                                            <div className="search-item-name">
                                                {stock.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {stock.symbol} |{" "}
                                                {stock.exchange} |{" "}
                                                {stock.type}
                                            </div>
                                        </div>
                                    </Link>

                                    <div
                                        onClick={(e) =>
                                            e.stopPropagation()
                                        }
                                        className="shrink-0"
                                    >
                                        <WatchlistButton
                                            type="icon"
                                            symbol={stock.symbol}
                                            company={stock.name}
                                            isInWatchlist={
                                                stock.isInWatchlist
                                            }
                                            onWatchlistChange={() =>
                                                handleToggleWatchlist(
                                                    stock.symbol,
                                                    stock.name
                                                )
                                            }
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}
