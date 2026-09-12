import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { SmartAlertCenter } from "@/features/alerts";
import { Show } from "@clerk/nextjs";

const Header = async ({ user }: { user?: any }) => {
    let initialStocks: StockWithWatchlistStatus[] = [];
    try {
        initialStocks = await searchStocks();
    } catch {
        initialStocks = [];
    }

    return (
        <header className="sticky top-0 header z-50">
            <div className="container header-wrapper">
                <Link href="/">
                    <Image
                        src="/assets/icons/L1.png"
                        alt="HyperStocks logo"
                        width={140}
                        height={32}
                        className="h-10 w-auto cursor-pointer"
                    />
                </Link>

                <Show when="signed-in">
                    <nav className="hidden sm:block">
                        <NavItems initialStocks={initialStocks} />
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <SmartAlertCenter />
                        <UserDropdown user={user} initialStocks={initialStocks} />
                    </div>
                </Show>

                <Show when="signed-out">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/sign-in"
                            className="text-xs font-semibold text-gray-300 hover:text-emerald-400 transition-colors px-3 py-1.5"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/sign-up"
                            className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-3.5 py-1.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all"
                        >
                            Get Started
                        </Link>
                    </div>
                </Show>
            </div>
        </header>
    );
};

export default Header;
