import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import { auth } from "@clerk/nextjs/server";
import WatchlistTabs from "./components/WatchlistTabs";
import WatchlistEmpty from "./components/WatchlistEmpty";

const WatchlistPage = async () => {
    const { userId } = await auth();

    if (!userId) {
        return <WatchlistEmpty />;
    }

    const watchlist = await getUserWatchlist(userId);

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
