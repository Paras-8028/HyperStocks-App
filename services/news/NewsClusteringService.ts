import {
    AnalyzedNewsArticle,
    MarketTimelineEvent,
    NewsCluster,
    NewsSentimentLabel,
    SectorImpact,
    StockImpact,
} from '@/types/news';

export class NewsClusteringService {
    /**
     * Clusters analyzed articles by common symbols, topics, and temporal proximity.
     */
    public static clusterArticles(articles: AnalyzedNewsArticle[]): NewsCluster[] {
        if (!articles || articles.length === 0) return [];

        const clusters: NewsCluster[] = [];
        const visited = new Set<number | string>();

        // Sort newest first
        const sorted = [...articles].sort((a, b) => b.datetime - a.datetime);

        for (let i = 0; i < sorted.length; i++) {
            const current = sorted[i];
            if (visited.has(current.id)) continue;

            visited.add(current.id);
            const clusterArticles: AnalyzedNewsArticle[] = [current];

            // Find matching articles
            for (let j = i + 1; j < sorted.length; j++) {
                const candidate = sorted[j];
                if (visited.has(candidate.id)) continue;

                if (this.areArticlesRelated(current, candidate)) {
                    visited.add(candidate.id);
                    clusterArticles.push(candidate);
                }
            }

            // Synthesize cluster
            const primary = clusterArticles[0];
            const allStocks = this.mergeStocks(clusterArticles.flatMap((a) => a.affectedStocks));
            const allSectors = this.mergeSectors(clusterArticles.flatMap((a) => a.affectedSectors));
            const dominantSentiment = this.resolveDominantSentiment(clusterArticles);

            const topic = this.inferTopicName(primary, allStocks, allSectors);

            const firstReported = Math.min(...clusterArticles.map((a) => a.datetime));
            const lastUpdated = Math.max(...clusterArticles.map((a) => a.datetime));

            clusters.push({
                id: `cluster-${primary.id}`,
                topic,
                primaryHeadline: primary.headline,
                summary: primary.summary,
                dominantSentiment,
                articles: clusterArticles,
                affectedStocks: allStocks,
                affectedSectors: allSectors,
                firstReported,
                lastUpdated,
            });
        }

        return clusters;
    }

    /**
     * Builds a chronological timeline of key market events.
     */
    public static buildMarketTimeline(clusters: NewsCluster[]): MarketTimelineEvent[] {
        const events: MarketTimelineEvent[] = [];

        // Order clusters by time (descending)
        const sortedClusters = [...clusters].sort((a, b) => b.lastUpdated - a.lastUpdated);

        for (const cluster of sortedClusters) {
            const primarySector = cluster.affectedSectors[0]?.sector;

            events.push({
                id: `timeline-${cluster.id}`,
                timestamp: cluster.lastUpdated,
                title: cluster.primaryHeadline,
                summary: cluster.summary || `Major market activity concerning ${cluster.topic}.`,
                sentiment: cluster.dominantSentiment,
                keySymbols: cluster.affectedStocks.map((s) => s.symbol).slice(0, 3),
                primarySector,
                source: cluster.articles[0]?.source || 'Financial Wire',
                url: cluster.articles[0]?.url,
                clusterId: cluster.id,
            });
        }

        return events;
    }

    private static areArticlesRelated(a: AnalyzedNewsArticle, b: AnalyzedNewsArticle): boolean {
        // 1. Common stock intersection
        const aSymbols = new Set(a.affectedStocks.map((s) => s.symbol));
        const hasCommonStock = b.affectedStocks.some((s) => aSymbols.has(s.symbol));

        // 2. Keyword overlap in headlines
        const aWords = new Set(
            a.headline
                .toLowerCase()
                .replace(/[^a-z0-9 ]/g, '')
                .split(' ')
                .filter((w) => w.length > 3)
        );
        const bWords = b.headline
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, '')
            .split(' ')
            .filter((w) => w.length > 3);

        let commonWords = 0;
        bWords.forEach((w) => {
            if (aWords.has(w)) commonWords++;
        });

        // 3. Time proximity
        const timeDiffHours = Math.abs(a.datetime - b.datetime) / (1000 * 60 * 60);

        // Direct common stock within 48 hours represents related company news cycle
        if (hasCommonStock && timeDiffHours <= 48) {
            return true;
        }

        // Shared topical keywords within 24 hours
        if (commonWords >= 2 && timeDiffHours <= 24) {
            return true;
        }

        return false;
    }

    private static mergeStocks(stocks: StockImpact[]): StockImpact[] {
        const map = new Map<string, StockImpact>();
        for (const s of stocks) {
            if (!map.has(s.symbol)) {
                map.set(s.symbol, s);
            } else {
                const existing = map.get(s.symbol)!;
                if (s.magnitude === 'high') {
                    existing.magnitude = 'high';
                }
            }
        }
        return Array.from(map.values());
    }

    private static mergeSectors(sectors: SectorImpact[]): SectorImpact[] {
        const map = new Map<string, SectorImpact>();
        for (const s of sectors) {
            if (!map.has(s.sector)) {
                map.set(s.sector, s);
            } else {
                const existing = map.get(s.sector)!;
                existing.weight = Math.min(1.0, existing.weight + s.weight * 0.3);
            }
        }
        return Array.from(map.values()).sort((a, b) => b.weight - a.weight);
    }

    private static resolveDominantSentiment(articles: AnalyzedNewsArticle[]): NewsSentimentLabel {
        let scoreSum = 0;
        articles.forEach((a) => {
            scoreSum += a.sentiment.score;
        });
        const avg = scoreSum / articles.length;
        if (avg >= 0.2) return 'positive';
        if (avg <= -0.2) return 'negative';
        return 'neutral';
    }

    private static inferTopicName(
        primary: AnalyzedNewsArticle,
        stocks: StockImpact[],
        sectors: SectorImpact[]
    ): string {
        if (stocks.length > 0) {
            const stockNames = stocks.map((s) => s.symbol).slice(0, 2).join(' & ');
            if (sectors.length > 0) {
                return `${stockNames} — ${sectors[0].sector} Developments`;
            }
            return `${stockNames} Coverage`;
        }

        if (sectors.length > 0) {
            return `${sectors[0].sector} Sector Flow`;
        }

        return 'Global Market Macro';
    }
}
