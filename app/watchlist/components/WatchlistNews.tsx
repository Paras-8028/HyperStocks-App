"use client";

import { useEffect, useState } from "react";
import { getNews } from "@/lib/actions/finnhub.actions";
import { ExternalLink } from "lucide-react";

type Props = {
    symbols: string[];
};

export default function WatchlistNews({ symbols }: Props) {
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<MarketNewsArticle[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchNews = async () => {
            try {
                setLoading(true);
                const data = await getNews(symbols);
                if (mounted) {
                    setArticles(data || []);
                }
            } catch (err) {
                console.error(err);
                if (mounted) setError("Failed to load news");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (symbols.length > 0) {
            fetchNews();
        } else {
            setLoading(false);
        }

        return () => {
            mounted = false;
        };
    }, [symbols.join(",")]);

    if (loading) {
        return (
            <div className="text-gray-400 py-6">
                Loading watchlist news…
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 py-6">
                {error}
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="text-gray-400 py-6">
                No recent news for your watchlist.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {articles.map((article) => (
                <a
                    key={article.id ? `news-${article.id}` : `news-${index}`}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-gray-700 p-4 hover:bg-gray-800 transition"
                >
                    <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-semibold text-gray-100">
                            {article.headline}
                        </h3>
                        <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                    </div>

                    <p className="text-sm text-gray-400 mt-2 line-clamp-3">
                        {article.summary}
                    </p>

                    <div className="mt-3 text-xs text-gray-500 flex gap-3">
                        <span>{article.source}</span>
                        <span>•</span>
                        <span>
                            {new Date(
                                (article.datetime || 0) * 1000
                            ).toLocaleDateString()}
                        </span>
                    </div>
                </a>
            ))}
        </div>
    );
}
