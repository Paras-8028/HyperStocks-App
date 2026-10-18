/**
 * HyperStocks Historical Data Ingestion CLI
 * 
 * Usage:
 *   Dry-Run (Default, Safe, No Database Writes):
 *     npx tsx scripts/ingest-historical-data.ts --symbols AAPL,MSFT --days 365
 * 
 *   Explicit Database Write Mode:
 *     npx tsx scripts/ingest-historical-data.ts --symbols AAPL,MSFT --days 365 --write
 * 
 * Flags:
 *   --symbols   Comma-separated list of symbols (default: AAPL,NVDA,MSFT)
 *   --days      Number of historical days to fetch (default: 365, max: 1825)
 *   --write     Explicitly commit records to MongoDB (default: false, dry-run only)
 *   --force     Force re-fetching even if bars exist locally (default: false)
 */

import './load-env';
import { HistoricalDataIngestService } from '../services/market/HistoricalDataIngestService';
import { getMarketService } from '../services/market';

function parseArgs(args: string[]) {
    let symbols = ['AAPL', 'NVDA', 'MSFT'];
    let days = 365;
    let write = false;
    let force = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--symbols' && args[i + 1]) {
            symbols = args[i + 1]
                .split(',')
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean);
            i++;
        } else if (arg === '--days' && args[i + 1]) {
            const parsed = parseInt(args[i + 1], 10);
            if (!isNaN(parsed) && parsed > 0) {
                days = Math.min(1825, parsed); // Cap at 5 years (1825 days)
            }
            i++;
        } else if (arg === '--write') {
            write = true;
        } else if (arg === '--force') {
            force = true;
        }
    }

    return { symbols, days, write, force };
}

async function main() {
    console.log('\n============================================================');
    console.log('📈 HyperStocks Historical Market Data Ingestion Tool');
    console.log('============================================================\n');

    const { symbols, days, write, force } = parseArgs(process.argv.slice(2));

    const nowSec = Math.floor(Date.now() / 1000);
    const fromSec = nowSec - days * 86400;

    console.log(`Configured Parameters:`);
    console.log(`  • Symbols:        ${symbols.join(', ')} (${symbols.length} total)`);
    console.log(`  • Historical Days: ${days} days`);
    console.log(`  • Date Window:    ${new Date(fromSec * 1000).toISOString().split('T')[0]} to ${new Date(nowSec * 1000).toISOString().split('T')[0]}`);
    console.log(`  • Mode:           ${write ? '⚠️ WRITE MODE (persisting to MongoDB)' : '🛡️ DRY-RUN MODE (validation only, no DB writes)'}`);
    console.log(`  • Skip Existing:  ${!force}`);
    console.log('------------------------------------------------------------\n');

    if (!write) {
        console.log('ℹ️ Running in DRY-RUN mode by default. Pass --write to persist bars to MongoDB.\n');
    }

    const service = new HistoricalDataIngestService(getMarketService());

    console.log('Starting ingestion job...');
    const result = await service.ingestSymbols(symbols, {
        from: fromSec,
        to: nowSec,
        resolution: 'D',
        concurrency: 2,
        delayMsBetweenSymbols: 350,
        maxRetries: 3,
        dryRun: !write,
        skipExisting: !force,
    });

    console.log('\n============================================================');
    console.log('📊 Ingestion Job Summary');
    console.log('============================================================');
    console.log(`  • Status:               Completed`);
    console.log(`  • Total Symbols:        ${result.totalSymbols}`);
    console.log(`  • Successful Symbols:   ${result.successfulSymbols}`);
    console.log(`  • Skipped (Cached):     ${result.skippedSymbols}`);
    console.log(`  • Failed Symbols:       ${result.failedSymbols}`);
    console.log(`  • Total Bars Validated: ${result.summaries.reduce((a, s) => a + s.barsSaved, 0)}`);
    console.log(`  • Total Bars Written:   ${write ? result.totalBarsSaved : 0} (dry-run = ${!write})`);
    console.log(`  • Duration:             ${result.startedAt} to ${result.completedAt}`);
    console.log('------------------------------------------------------------\n');

    result.summaries.forEach((s) => {
        const icon = s.status === 'success' ? '✅' : s.status === 'skipped' ? '⏭️' : '❌';
        console.log(`  ${icon} ${s.symbol.padEnd(8)}: ${s.status.toUpperCase()} (${s.barsSaved} bars) ${s.error ? `Error: ${s.error}` : ''}`);
    });
    console.log('\n');
}

// Only execute when run directly via CLI
if (require.main === module) {
    main().catch((err) => {
        console.error('Fatal CLI Error:', err?.message || err);
        process.exit(1);
    });
}
