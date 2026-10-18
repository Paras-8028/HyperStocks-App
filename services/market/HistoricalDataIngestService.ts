import { getMarketService } from '@/services/market';
import { IMarketDataProvider } from '@/services/market/IMarketDataProvider';
import { HistoricalBarModel } from '@/database/models/historical_bar.model';
import { connectToDatabase } from '@/database/mongoose';
import { CandleResolution, StockCandlesResult } from '@/types/market';

export interface IngestionOptions {
    from: number; // Unix epoch in seconds
    to: number; // Unix epoch in seconds
    resolution?: CandleResolution; // default 'D'
    concurrency?: number; // default 2 concurrent symbol tasks
    delayMsBetweenSymbols?: number; // default 300ms throttle between batches
    maxRetries?: number; // default 3 exponential backoff retries
    dryRun?: boolean; // default false: dryRun validates and counts without writing to MongoDB
    skipExisting?: boolean; // default true: skip fetching if range is already covered locally
}

export interface SymbolIngestionSummary {
    symbol: string;
    status: 'success' | 'no_data' | 'error' | 'skipped';
    barsFetched: number;
    barsSaved: number;
    earliestBarDate?: string;
    latestBarDate?: string;
    error?: string;
    retryCount: number;
}

export interface IngestionJobResult {
    startedAt: string;
    completedAt: string;
    totalSymbols: number;
    successfulSymbols: number;
    failedSymbols: number;
    skippedSymbols: number;
    totalBarsSaved: number;
    dryRun: boolean;
    summaries: SymbolIngestionSummary[];
}

export class HistoricalDataIngestService {
    private readonly marketService: IMarketDataProvider;

    constructor(marketService?: IMarketDataProvider) {
        this.marketService = marketService || getMarketService();
    }

    /**
     * Ingests historical market bars for an array of symbols across a defined date range.
     */
    public async ingestSymbols(
        symbols: string[],
        options: IngestionOptions
    ): Promise<IngestionJobResult> {
        const startedAt = new Date().toISOString();
        const {
            from,
            to,
            resolution = 'D',
            concurrency = 2,
            delayMsBetweenSymbols = 300,
            maxRetries = 3,
            dryRun = false,
            skipExisting = true,
        } = options;

        if (!dryRun) {
            await connectToDatabase();
        }

        // 1. Deduplicate, clean, and sort symbols
        const cleanSymbols = Array.from(
            new Set(
                symbols
                    .map((s) => (s || '').trim().toUpperCase())
                    .filter((s) => s.length > 0 && /^[A-Z0-9.\-_]{1,12}$/.test(s))
            )
        );

        const summaries: SymbolIngestionSummary[] = [];
        let totalBarsSaved = 0;

        // 2. Process in bounded concurrent chunks
        for (let i = 0; i < cleanSymbols.length; i += concurrency) {
            const chunk = cleanSymbols.slice(i, i + concurrency);
            const chunkResults = await Promise.all(
                chunk.map((sym) =>
                    this.ingestSingleSymbol(sym, {
                        from,
                        to,
                        resolution,
                        maxRetries,
                        dryRun,
                        skipExisting,
                    })
                )
            );

            summaries.push(...chunkResults);
            totalBarsSaved += chunkResults.reduce((acc, r) => acc + r.barsSaved, 0);

            // Throttle between chunks to protect Finnhub API rate limits
            if (i + concurrency < cleanSymbols.length && delayMsBetweenSymbols > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMsBetweenSymbols));
            }
        }

        const successfulSymbols = summaries.filter((s) => s.status === 'success').length;
        const skippedSymbols = summaries.filter((s) => s.status === 'skipped').length;
        const failedSymbols = summaries.filter((s) => s.status === 'error' || s.status === 'no_data').length;

        return {
            startedAt,
            completedAt: new Date().toISOString(),
            totalSymbols: cleanSymbols.length,
            successfulSymbols,
            failedSymbols,
            skippedSymbols,
            totalBarsSaved,
            dryRun,
            summaries,
        };
    }

    /**
     * Ingests historical bars for a single symbol with exponential backoff and rate-limit handling.
     */
    public async ingestSingleSymbol(
        symbol: string,
        options: {
            from: number;
            to: number;
            resolution: CandleResolution;
            maxRetries: number;
            dryRun: boolean;
            skipExisting: boolean;
        }
    ): Promise<SymbolIngestionSummary> {
        const { from, to, resolution, maxRetries, dryRun, skipExisting } = options;

        // Check if data is already covered locally
        if (!dryRun && skipExisting) {
            try {
                const fromDate = new Date(from * 1000);
                const toDate = new Date(to * 1000);
                const existingCount = await HistoricalBarModel.countDocuments({
                    symbol,
                    resolution,
                    timestamp: { $gte: fromDate, $lte: toDate },
                });

                // Estimate expected trading days: ~252 per calendar year
                const calendarDays = (to - from) / 86400;
                const estimatedTradingDays = Math.floor(calendarDays * (5 / 7));

                if (existingCount >= estimatedTradingDays && existingCount > 10) {
                    return {
                        symbol,
                        status: 'skipped',
                        barsFetched: 0,
                        barsSaved: 0,
                        retryCount: 0,
                    };
                }
            } catch (err) {
                // If checking fails, proceed to fetch
            }
        }

        let retryCount = 0;
        let lastError: string | undefined;

        while (retryCount <= maxRetries) {
            try {
                const candleResult = await this.marketService.getCandles(symbol, resolution, from, to);

                if (!candleResult.success) {
                    const isRateLimit = candleResult.code === 429 || String(candleResult.error).includes('429');
                    if (isRateLimit) {
                        retryCount++;
                        const backoffMs = Math.min(10000, 1500 * Math.pow(2, retryCount));
                        await new Promise((r) => setTimeout(r, backoffMs));
                        continue;
                    }

                    return {
                        symbol,
                        status: 'error',
                        barsFetched: 0,
                        barsSaved: 0,
                        error: candleResult.error || 'Provider returned failure',
                        retryCount,
                    };
                }

                const data: StockCandlesResult = candleResult.data;

                if (!data || data.status === 'no_data' || !data.close || data.close.length === 0) {
                    return {
                        symbol,
                        status: 'no_data',
                        barsFetched: 0,
                        barsSaved: 0,
                        error: 'No candle data available from provider',
                        retryCount,
                    };
                }

                // 3. Filter and validate internally consistent bars
                const validBars: Array<{
                    symbol: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    resolution: string;
                    source: string;
                    isSplitAdjusted: boolean;
                    isDividendAdjusted: boolean;
                }> = [];

                for (let idx = 0; idx < data.close.length; idx++) {
                    const c = data.close[idx];
                    const o = data.open?.[idx] ?? c;
                    const h = data.high?.[idx] ?? Math.max(o, c);
                    const l = data.low?.[idx] ?? Math.min(o, c);
                    const v = data.volume?.[idx] ?? 0;
                    const ts = data.timestamps?.[idx];

                    // Validate numerical sanity
                    if (
                        typeof c === 'number' &&
                        !isNaN(c) &&
                        c > 0 &&
                        typeof o === 'number' &&
                        !isNaN(o) &&
                        o > 0 &&
                        typeof h === 'number' &&
                        !isNaN(h) &&
                        h > 0 &&
                        typeof l === 'number' &&
                        !isNaN(l) &&
                        l > 0 &&
                        typeof v === 'number' &&
                        !isNaN(v) &&
                        v >= 0 &&
                        typeof ts === 'number' &&
                        ts > 0 &&
                        h >= l &&
                        h >= o &&
                        h >= c &&
                        l <= o &&
                        l <= c
                    ) {
                        validBars.push({
                            symbol,
                            timestamp: new Date(ts * 1000),
                            open: Number(o.toFixed(4)),
                            high: Number(h.toFixed(4)),
                            low: Number(l.toFixed(4)),
                            close: Number(c.toFixed(4)),
                            volume: Math.floor(v),
                            resolution,
                            source: 'finnhub',
                            isSplitAdjusted: true,
                            isDividendAdjusted: false,
                        });
                    }
                }

                if (validBars.length === 0) {
                    return {
                        symbol,
                        status: 'no_data',
                        barsFetched: data.close.length,
                        barsSaved: 0,
                        error: 'All fetched bars failed numerical validation',
                        retryCount,
                    };
                }

                // Sort chronologically
                validBars.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                // 4. In dry-run mode, report counts without database writes
                if (dryRun) {
                    return {
                        symbol,
                        status: 'success',
                        barsFetched: data.close.length,
                        barsSaved: validBars.length,
                        earliestBarDate: validBars[0].timestamp.toISOString(),
                        latestBarDate: validBars[validBars.length - 1].timestamp.toISOString(),
                        retryCount,
                    };
                }

                // 5. Idempotent bulk upsert into MongoDB
                const bulkOps = validBars.map((bar) => ({
                    updateOne: {
                        filter: {
                            symbol: bar.symbol,
                            timestamp: bar.timestamp,
                            resolution: bar.resolution,
                            source: bar.source,
                        },
                        update: {
                            $set: {
                                open: bar.open,
                                high: bar.high,
                                low: bar.low,
                                close: bar.close,
                                volume: bar.volume,
                                isSplitAdjusted: bar.isSplitAdjusted,
                                isDividendAdjusted: bar.isDividendAdjusted,
                                ingestedAt: new Date(),
                            },
                        },
                        upsert: true,
                    },
                }));

                const bulkWriteResult = await HistoricalBarModel.bulkWrite(bulkOps, {
                    ordered: false,
                });

                const savedCount =
                    (bulkWriteResult.upsertedCount || 0) + (bulkWriteResult.modifiedCount || 0) + (bulkWriteResult.matchedCount || 0);

                return {
                    symbol,
                    status: 'success',
                    barsFetched: data.close.length,
                    barsSaved: validBars.length,
                    earliestBarDate: validBars[0].timestamp.toISOString(),
                    latestBarDate: validBars[validBars.length - 1].timestamp.toISOString(),
                    retryCount,
                };
            } catch (err: any) {
                lastError = err?.message || 'Unexpected exception during single symbol ingestion';
                retryCount++;
                if (retryCount <= maxRetries) {
                    await new Promise((r) => setTimeout(r, 1000 * retryCount));
                }
            }
        }

        return {
            symbol,
            status: 'error',
            barsFetched: 0,
            barsSaved: 0,
            error: lastError || 'Exhausted maximum retry attempts',
            retryCount,
        };
    }
}
