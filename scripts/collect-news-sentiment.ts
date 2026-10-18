/**
 * HyperStocks News and Sentiment Ingestion CLI
 * 
 * Usage:
 *   Dry-run mode (Safe, no database writes):
 *     npx tsx scripts/collect-news-sentiment.ts --symbols AAPL,MSFT --dry-run
 * 
 *   Explicit persistence mode:
 *     npx tsx scripts/collect-news-sentiment.ts --symbols AAPL,MSFT
 * 
 * Flags:
 *   --symbols   Comma-separated tickers (default: active watchlist or AAPL,MSFT,NVDA)
 *   --dry-run   Run without writing records to MongoDB (default: false)
 *   --force     Force re-assessment of existing articles (default: false)
 */

import './load-env';
import { NewsSentimentCollectorService } from '../services/news/NewsSentimentCollectorService';

function parseArgs(args: string[]) {
    let symbols: string[] | undefined;
    let dryRun = false;
    let force = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--symbols' && args[i + 1]) {
            symbols = args[i + 1]
                .split(',')
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean);
            i++;
        } else if (arg === '--dry-run') {
            dryRun = true;
        } else if (arg === '--force') {
            force = true;
        }
    }

    return { symbols, dryRun, force };
}

async function main() {
    console.log('\n============================================================');
    console.log('📰 HyperStocks Automated News & Sentiment Collector CLI');
    console.log('============================================================\n');

    const { symbols, dryRun, force } = parseArgs(process.argv.slice(2));

    console.log('Parameters:');
    console.log(`  • Symbols:   ${symbols ? symbols.join(', ') : 'Auto-discover active watchlist symbols'}`);
    console.log(`  • Mode:      ${dryRun ? '🛡️ DRY-RUN (no database writes)' : '⚠️ PERSISTENCE (writing point-in-time sentiment records)'}`);
    console.log(`  • Force:     ${force}`);
    console.log('------------------------------------------------------------\n');

    console.log('Executing collection job...');
    const summary = await NewsSentimentCollectorService.runCollection(symbols, {
        dryRun,
        forceReassess: force,
        concurrency: 2,
        delayBetweenBatchesMs: 300,
    });

    console.log('\n============================================================');
    console.log('📊 Collector Ingestion Summary');
    console.log('============================================================');
    console.log(`  • Symbols Processed:            ${summary.symbolsProcessed.join(', ')}`);
    console.log(`  • Total Articles Ingested:      ${summary.totalArticlesRetrieved}`);
    console.log(`  • New Sentiment Records Saved:  ${summary.newArticlesSaved}`);
    console.log(`  • Duplicate Articles Skipped:   ${summary.duplicateArticlesSkipped}`);
    console.log(`  • Failed Provider Requests:     ${summary.failedProviderRequests}`);
    console.log(`  • Processing Failures:          ${summary.sentimentProcessingFailures}`);
    console.log(`  • Oldest Article Timestamp:     ${summary.oldestCollectedTimestamp || 'N/A'}`);
    console.log(`  • Newest Article Timestamp:     ${summary.newestCollectedTimestamp || 'N/A'}`);
    console.log(`  • Duration:                     ${summary.startedAt} to ${summary.completedAt}`);
    console.log('------------------------------------------------------------\n');

    if (summary.errors.length > 0) {
        console.log('⚠️ Recorded Warnings / Errors:');
        summary.errors.forEach((e) => console.log(`   - ${e}`));
        console.log('\n');
    }

    const stats = await NewsSentimentCollectorService.getCollectionStats();
    console.log('📈 Longitudinal Database Status:');
    console.log(`  • Total Sentiment Records in DB:    ${stats.totalSentimentRecords}`);
    console.log(`  • Point-in-Time Records Count:      ${stats.pointInTimeRecordsCount}`);
    console.log(`  • Retrospective Inferences Count:   ${stats.retrospectiveRecordsCount}`);
    console.log(`  • Tracked Unique Symbols:           ${stats.uniqueSymbolsCount}`);
    console.log(`  • Total Historical Price Bars:      ${stats.totalHistoricalBars}`);
    console.log(`  • Evaluation Integrity Status:      ${stats.currentEvaluationIntegrityStatus}`);
    console.log('============================================================\n');
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal CLI Error:', err?.message || err);
            process.exit(1);
        });
}
