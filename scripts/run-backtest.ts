#!/usr/bin/env node
/**
 * ============================================================================
 * HyperStocks Historical Backtesting CLI
 * ============================================================================
 * 
 * Executes an offline, deterministic historical backtest of the existing
 * quantitative downside-risk engine against persisted market bars.
 * 
 * Safety Guarantees:
 * 1. Reads ONLY locally persisted historical bars from MongoDB.
 * 2. NEVER calls live market data APIs (Finnhub, Gemini, etc.).
 * 3. NEVER triggers production emails, notifications, or Inngest jobs.
 * 4. Strictly prevents look-ahead bias (features at date t evaluate only [0..t]).
 * 5. Report-only by default; pass --persist to save run metadata to MongoDB.
 * 
 * Usage Examples:
 *   npx tsx scripts/run-backtest.ts --symbols AAPL,MSFT
 *   npx tsx scripts/run-backtest.ts --symbols AAPL --start 2023-01-01 --end 2024-01-01
 *   npx tsx scripts/run-backtest.ts --symbols AAPL,MSFT,NVDA --primary-horizon 5 --primary-threshold -5 --persist
 */

import './load-env';
import { connectToDatabase } from '@/database/mongoose';
import { BacktestEngine } from '@/services/backtesting/BacktestEngine';
import { BacktestConfig } from '@/types/backtesting';
import { RiskSeverity } from '@/types/risk';

function parseArgs(): {
    symbols: string[];
    startDate?: string;
    endDate?: string;
    primaryHorizon: number;
    primaryThreshold: number;
    secondaryHorizon: number;
    secondaryThreshold: number;
    minHistory: number;
    severity: RiskSeverity;
    persist: boolean;
} {
    const args = process.argv.slice(2);
    let symbols = ['AAPL'];
    let startDate: string | undefined;
    let endDate: string | undefined;
    let primaryHorizon = 5;
    let primaryThreshold = -5.0;
    let secondaryHorizon = 10;
    let secondaryThreshold = -8.0;
    let minHistory = 200;
    let severity: RiskSeverity = 'warning';
    let persist = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--symbols' && args[i + 1]) {
            symbols = args[i + 1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
            i++;
        } else if (arg === '--start' && args[i + 1]) {
            startDate = args[i + 1];
            i++;
        } else if (arg === '--end' && args[i + 1]) {
            endDate = args[i + 1];
            i++;
        } else if (arg === '--primary-horizon' && args[i + 1]) {
            primaryHorizon = parseInt(args[i + 1], 10);
            i++;
        } else if (arg === '--primary-threshold' && args[i + 1]) {
            primaryThreshold = parseFloat(args[i + 1]);
            i++;
        } else if (arg === '--secondary-horizon' && args[i + 1]) {
            secondaryHorizon = parseInt(args[i + 1], 10);
            i++;
        } else if (arg === '--secondary-threshold' && args[i + 1]) {
            secondaryThreshold = parseFloat(args[i + 1]);
            i++;
        } else if (arg === '--min-history' && args[i + 1]) {
            minHistory = parseInt(args[i + 1], 10);
            i++;
        } else if (arg === '--severity' && args[i + 1]) {
            severity = args[i + 1] as RiskSeverity;
            i++;
        } else if (arg === '--persist') {
            persist = true;
        }
    }

    // Validation
    if (primaryHorizon <= 0 || primaryHorizon > 60) {
        throw new Error(`Invalid --primary-horizon: ${primaryHorizon}. Must be between 1 and 60 trading days.`);
    }
    if (primaryThreshold >= 0) {
        primaryThreshold = -Math.abs(primaryThreshold);
    }
    if (secondaryThreshold >= 0) {
        secondaryThreshold = -Math.abs(secondaryThreshold);
    }
    if (minHistory < 20) {
        throw new Error(`Invalid --min-history: ${minHistory}. Must be at least 20 trading days.`);
    }

    return {
        symbols,
        startDate,
        endDate,
        primaryHorizon,
        primaryThreshold,
        secondaryHorizon,
        secondaryThreshold,
        minHistory,
        severity,
        persist,
    };
}

async function main() {
    console.log('\n============================================================');
    console.log('🔬 HyperStocks Historical Backtesting Engine (Phase 5B)');
    console.log('============================================================\n');

    const params = parseArgs();

    console.log('Configuration Parameters:');
    console.log(`  • Universe:             ${params.symbols.join(', ')} (${params.symbols.length} symbol(s))`);
    console.log(`  • Date Window:          ${params.startDate || 'Earliest available'} to ${params.endDate || 'Latest available'}`);
    console.log(`  • Primary Target:       >= ${Math.abs(params.primaryThreshold)}% decline within next ${params.primaryHorizon} trading sessions`);
    console.log(`  • Secondary Target:     >= ${Math.abs(params.secondaryThreshold)}% decline within next ${params.secondaryHorizon} trading sessions`);
    console.log(`  • Signal Threshold:     Severity >= '${params.severity}'`);
    console.log(`  • Minimum Warmup:       ${params.minHistory} trading sessions`);
    console.log(`  • Mode:                 ${params.persist ? '💾 PERSIST RUN (Writing summary to MongoDB)' : '📋 REPORT-ONLY (No DB writes)'}`);
    console.log('------------------------------------------------------------\n');

    try {
        console.log('Connecting to MongoDB...');
        await connectToDatabase();
        console.log('✅ Connected to MongoDB.\n');
    } catch (dbErr: any) {
        console.error(`❌ Database connection failed: ${dbErr.message}`);
        console.error('The backtest CLI requires local MongoDB access to read historical bars.');
        process.exit(1);
    }

    const config: BacktestConfig = {
        symbols: params.symbols,
        startDate: params.startDate,
        endDate: params.endDate,
        primaryHorizonDays: params.primaryHorizon,
        primaryThresholdPercent: params.primaryThreshold,
        secondaryHorizonDays: params.secondaryHorizon,
        secondaryThresholdPercent: params.secondaryThreshold,
        signalSeverityThreshold: params.severity,
        minHistoryWarmupDays: params.minHistory,
        includeBaselines: true,
        persistRun: params.persist,
    };

    console.log('Starting historical simulation...\n');
    const report = await BacktestEngine.runBacktest(config);

    console.log('============================================================');
    console.log(`📊 Backtest Execution Report [Run ID: ${report.runId}]`);
    console.log('============================================================');
    console.log(`Engine Version:        ${report.engineVersion}`);
    console.log(`Date Range Evaluated:  ${report.dateRange.from} to ${report.dateRange.to}`);
    console.log(`Total Bars Loaded:     ${report.totalBarsLoaded}`);
    console.log(`Total Observations:    ${report.primaryTarget.confusionMatrix.totalObservations}`);
    console.log(`Eligible Observations: ${report.primaryTarget.confusionMatrix.eligibleObservations}`);
    console.log(`Excluded (Warmup):     ${report.primaryTarget.confusionMatrix.excludedInsufficientHistory}`);
    console.log(`Excluded (Incomplete): ${report.primaryTarget.confusionMatrix.excludedIncompleteHorizon}`);
    console.log('------------------------------------------------------------');

    console.log('\n--- Primary Target Evaluation (5-Day >= 5% Decline) ---');
    const cm = report.primaryTarget.confusionMatrix;
    const m = report.primaryTarget.metrics;
    console.log(`  True Positives (TP):   ${cm.truePositives}`);
    console.log(`  False Positives (FP):  ${cm.falsePositives}`);
    console.log(`  True Negatives (TN):   ${cm.trueNegatives}`);
    console.log(`  False Negatives (FN):  ${cm.falseNegatives}`);
    console.log(`  ----------------------------------------`);
    console.log(`  Precision:             ${m.precision !== null ? (m.precision * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`  Recall:                ${m.recall !== null ? (m.recall * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`  Specificity:           ${m.specificity !== null ? (m.specificity * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`  False Positive Rate:   ${m.falsePositiveRate !== null ? (m.falsePositiveRate * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`  Event Base Rate:       ${m.eventBaseRate !== null ? (m.eventBaseRate * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`  F1 Score:              ${m.f1Score !== null ? m.f1Score.toFixed(4) : 'N/A'}`);
    console.log(`  Alerts / Symbol / Yr:  ${m.alertsPerSymbolPerYear !== null ? m.alertsPerSymbolPerYear : 'N/A'}`);
    console.log(`  Median Lead Time:      ${m.medianLeadTimeDays !== null ? m.medianLeadTimeDays + ' sessions' : 'N/A'}`);

    console.log('\n--- Baseline Comparisons ---');
    console.log(`1. Unconditional Always-Alert:`);
    console.log(`     Precision: ${report.baselines.unconditional.metrics.precision !== null ? (report.baselines.unconditional.metrics.precision * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`     Recall:    ${report.baselines.unconditional.metrics.recall !== null ? (report.baselines.unconditional.metrics.recall * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`2. Price Below 200-Day SMA:`);
    console.log(`     Precision: ${report.baselines.sma200Breakdown.metrics.precision !== null ? (report.baselines.sma200Breakdown.metrics.precision * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`     Recall:    ${report.baselines.sma200Breakdown.metrics.recall !== null ? (report.baselines.sma200Breakdown.metrics.recall * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`3. Market Index Context:`);
    console.log(`     Status:    ${report.baselines.marketIndex?.isAvailable ? 'Evaluated' : 'Unavailable (' + report.baselines.marketIndex?.unavailableReason + ')'}`);

    if (report.dataQualitySummary.warnings.length > 0) {
        console.log('\n⚠️ Data Quality Warnings:');
        report.dataQualitySummary.warnings.forEach((w) => console.log(`  • ${w}`));
    }

    console.log('\n📜 Statistical Limitations & Disclaimers:');
    report.statisticalLimitations.forEach((l) => console.log(`  • ${l}`));

    console.log('\n============================================================');
    console.log('✅ Simulation Completed Deterministically (Offline, Zero Live Calls)');
    console.log('============================================================\n');
}

if (require.main === module) {
    main().catch((err) => {
        console.error(`Fatal Backtest Error: ${err.message}`);
        process.exit(1);
    });
}
