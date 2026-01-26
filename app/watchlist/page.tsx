import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import { auth } from "@/lib/better-auth/auth";
import WatchlistTabs from "./components/WatchlistTabs";
import WatchlistEmpty from "./components/WatchlistEmpty";
import { headers } from "next/headers";

const WatchlistPage = async () => {
    // ✅ REQUIRED for better-auth
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.email) {
        return <WatchlistEmpty />;
    }

    const watchlist = await getUserWatchlist(session.user.email);

    if (!watchlist || watchlist.length === 0) {
        return <WatchlistEmpty />;
    }

    return (
        <div className="container max-w-5xl py-8 space-y-6">
            <h1 className="text-2xl font-semibold text-gray-100 mb-6">
                Your Watchlist
            </h1>

            <WatchlistTabs items={watchlist} />
        </div>
    );
};

export default WatchlistPage;
