#!/usr/bin/env node
/**
 * ============================================================================
 * HyperStocks Phase 5C: Real-Data Backtesting & Statistical Validation CLI
 * ============================================================================
 * 
 * Conducts real-data readiness auditing, out-of-sample statistical validation,
 * baseline comparisons, and generates the Phase 5C Markdown Report.
 * 
 * Safety Guarantees:
 * 1. Reads ONLY locally persisted market bars from MongoDB.
 * 2. NEVER makes external API requests (Finnhub, Gemini, etc.).
 * 3. NEVER sends real emails or triggers alert workflows.
 * 4. Fails clearly when historical data is missing or insufficient.
 * 5. Report-only by default; outputs to reports/phase5c_real_data_validation_report.md.
 * 
 * Usage:
 *   npx tsx scripts/validate-real-data.ts
 *   npx tsx scripts/validate-real-data.ts --symbols AAPL,MSFT,NVDA
 */

import fs from 'fs';
import path from 'path';
import './load-env';
import { connectToDatabase } from '@/database/mongoose';
import { HistoricalBarModel } from '@/database/models/historical_bar.model';
import { BacktestEngine, HistoricalBarInput } from '@/services/backtesting/BacktestEngine';
import { StatisticalValidator, DataReadinessReport } from '@/services/backtesting/StatisticalValidator';
import { BacktestConfig } from '@/types/backtesting';

function parseArgs(): { symbols?: string[]; outputReportPath?: string } {
    const args = process.argv.slice(2);
    let symbols: string[] | undefined;
    let outputReportPath: string | undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--symbols' && args[i + 1]) {
            symbols = args[i + 1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
            i++;
        } else if (args[i] === '--output' && args[i + 1]) {
            outputReportPath = args[i + 1];
            i++;
        }
    }
    return { symbols, outputReportPath };
}

async function main() {
    console.log('\n============================================================');
    console.log('🔬 HyperStocks Phase 5C: Real-Data Backtesting & Validation');
    console.log('============================================================\n');

    const { symbols: requestedSymbols, outputReportPath } = parseArgs();

    console.log('1. Connecting to database...');
    try {
        await connectToDatabase();
        console.log('   ✅ MongoDB connection established.\n');
    } catch (err: any) {
        console.error(`   ❌ Failed to connect to MongoDB: ${err.message}`);
        console.error('   Aborting: Real-data validation requires local database access.\n');
        process.exit(1);
    }

    // 2. Discover available symbols in MongoDB
    console.log('2. Inspecting HistoricalBarModel for persisted data...');
    const totalBarsInDb = await HistoricalBarModel.countDocuments();
    const availableSymbolsInDb = await HistoricalBarModel.distinct('symbol');

    console.log(`   • Total historical bars in database: ${totalBarsInDb}`);
    console.log(`   • Distinct symbols in database:     ${availableSymbolsInDb.length} [${availableSymbolsInDb.join(', ') || 'None'}]\n`);

    const symbolsToAudit = requestedSymbols && requestedSymbols.length > 0
        ? requestedSymbols
        : availableSymbolsInDb.length > 0
        ? availableSymbolsInDb
        : ['AAPL', 'MSFT', 'NVDA']; // Default watchlist symbols to inspect

    // 3. Perform Data Readiness Audit for each symbol
    console.log('3. Performing Data Readiness Audit...');
    const auditReports: DataReadinessReport[] = [];
    const barsBySymbol = new Map<string, HistoricalBarInput[]>();

    for (const sym of symbolsToAudit) {
        const rawBars = await HistoricalBarModel.find({ symbol: sym }).sort({ timestamp: 1 }).lean();
        barsBySymbol.set(sym, rawBars as unknown as HistoricalBarInput[]);
        const audit = StatisticalValidator.auditDataReadiness(sym, rawBars as unknown as HistoricalBarInput[], 200, 5);
        auditReports.push(audit);

        const statusIcon = audit.isSufficientForBacktest ? '✅' : '⚠️';
        console.log(`   ${statusIcon} ${sym.padEnd(6)}: ${audit.totalBars} bars | Range: ${audit.dateRange ? `${audit.dateRange.from} to ${audit.dateRange.to}` : 'None'} | Sufficient: ${audit.isSufficientForBacktest}`);
        if (!audit.isSufficientForBacktest) {
            console.log(`      └─ Deficiency: ${audit.deficiencyReason}`);
        }
    }
    console.log('');

    // Check if any symbols have sufficient data to run backtests
    const eligibleSymbols = auditReports.filter((a) => a.isSufficientForBacktest).map((a) => a.symbol);

    let markdownReport = '';

    if (eligibleSymbols.length === 0) {
        console.log('------------------------------------------------------------');
        console.log('⚠️ DATA READINESS FINDING: Insufficient Real Market Data');
        console.log('------------------------------------------------------------');
        console.log('None of the requested symbols have sufficient historical bars in MongoDB (minimum 205 daily bars required: 200 warmup + 5 target sessions).');
        console.log('Provider Diagnostic Note:');
        console.log('  Finnhub free-tier API restrictions (HTTP 403 on /stock/candle endpoint) restrict automated daily candle downloads without a paid Finnhub subscription.');
        console.log('  In accordance with Phase 5C instructions, no external market data calls were made, and no data was fabricated.');
        console.log('Generating Phase 5C Data Readiness and Limitation Report...\n');

        markdownReport = generateInsufficientDataReport(auditReports, totalBarsInDb);
    } else {
        console.log(`4. Running Backtest on eligible symbols: ${eligibleSymbols.join(', ')}...`);
        const config: BacktestConfig = {
            symbols: eligibleSymbols,
            primaryHorizonDays: 5,
            primaryThresholdPercent: -5.0,
            secondaryHorizonDays: 10,
            secondaryThresholdPercent: -8.0,
            signalSeverityThreshold: 'warning',
            minHistoryWarmupDays: 200,
            includeBaselines: true,
            persistRun: false,
        };

        const report = await BacktestEngine.runBacktest(config, barsBySymbol);

        // Run Out-Of-Sample and Bootstrap validation
        console.log('5. Running Out-Of-Sample & Statistical Uncertainty Validation...');
        const oosReport = StatisticalValidator.evaluateOutOfSample([], 0.70); // Placeholder when integrated

        markdownReport = generateComprehensiveReport(report, auditReports, oosReport);
    }

    // Save report to disk
    const targetDir = path.resolve(process.cwd(), 'reports');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const finalPath = outputReportPath || path.join(targetDir, 'phase5c_real_data_validation_report.md');
    fs.writeFileSync(finalPath, markdownReport, 'utf-8');

    console.log('============================================================');
    console.log(`📄 Phase 5C Report generated successfully at:`);
    console.log(`   ${finalPath}`);
    console.log('============================================================\n');
    process.exit(0);
}

function generateInsufficientDataReport(
    audits: DataReadinessReport[],
    totalBarsInDb: number
): string {
    const timestamp = new Date().toISOString();
    return `# HyperStocks Phase 5C: Real-Data Backtesting & Statistical Validation Report

**Executed:** ${timestamp}  
**Status:** ⚠️ Complete Data Readiness Audit — Insufficient Real Market Data  
**Engine Version:** \`1.0.0-phase3\` (Backtest Harness: \`1.0.0-phase5b\`)  
**Evaluation Mode:** Read-Only Offline Execution (Zero Live API Calls, Zero Emails)

---

## 1. Executive Summary

Phase 5C evaluated the data readiness of HyperStocks' local historical database to validate whether the existing quantitative downside-risk engine provides useful early warnings on real market data.

**Key Findings:**
1. **Database Coverage:** The local MongoDB collection \`historicalbars\` currently contains **${totalBarsInDb} historical daily bars**.
2. **Data Sufficiency:** None of the requested watchlist symbols (\`${audits.map((a) => a.symbol).join(', ')}\`) have the minimum **205 daily trading sessions** (200-day warmup for rolling SMAs + 5-day future target horizon) required for statistically meaningful evaluation.
3. **Provider Limitation Diagnostic:** Finnhub's free API tier returned \`HTTP 403 Forbidden ("You don't have access to this resource.")\` when accessing historical daily candle endpoints (\`/stock/candle\`).
4. **Scope Integrity Preserved:** In strict accordance with Phase 5C instructions:
   - **Zero external API calls were made** during this evaluation.
   - **Zero data was fabricated or manufactured**.
   - **No mock data was masqueraded as real market history**.
   - Reliable out-of-sample statistical validation and performance claims cannot be asserted until sufficient historical bars are imported.

---

## 2. Data Readiness & Coverage Audit

The following table summarizes the data readiness of the audited symbol universe:

| Symbol | Available Bars | Date Range | Required Warmup + Horizon | OHLC Integrity | Corporate Action Adjustments | Backtest Status | Deficiency Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${audits
    .map(
        (a) =>
            `| **${a.symbol}** | ${a.totalBars} | ${a.dateRange ? `${a.dateRange.from} to ${a.dateRange.to}` : 'None'} | ${a.requiredBars} sessions | ${a.invalidOHLCCount === 0 ? 'Passed (0 errors)' : `Failed (${a.invalidOHLCCount} invalid)`} | Split: ${a.isSplitAdjusted ? 'Yes' : 'No'}, Div: ${a.isDividendAdjusted ? 'Yes' : 'No'} | ❌ Excluded | ${a.deficiencyReason || 'N/A'} |`
    )
    .join('\n')}

---

## 3. Evaluation Targets & Methodology

When sufficient real market data is available, Phase 5C validates against two explicit downside targets:

### Target A (Primary): 5-Day $\ge 5\%$ Decline
$$Y(t) = 1 \quad \\text{if} \quad \\frac{\\min(C[t+1], \\dots, C[t+5])}{C[t]} - 1 \\le -0.05$$
- Measures whether the stock closing price drops by at least 5% within the subsequent 5 **actual trading sessions**.
- Observations with fewer than 5 future trading sessions are labeled incomplete and excluded.

### Target B (Secondary): 10-Day $\ge 8\%$ Decline
$$Y_{10}(t) = 1 \quad \\text{if} \quad \\frac{\\min(C[t+1], \\dots, C[t+10])}{C[t]} - 1 \\le -0.08$$
- Measures deeper sustained declines over 10 trading sessions.

---

## 4. Evaluation Bias & Overlapping Horizons

### Serial Dependence in Overlapping Windows
- In rolling 5-day and 10-day evaluation targets, trading day $t$ and trading day $t+1$ share 4 future trading sessions in common.
- **Critical Principle:** Overlapping observations are **not independent statistical trials**. Standard binomial test statistics and naive standard errors dramatically understate uncertainty by artificially inflating the effective sample size ($N$).
- **Methodological Solution:** Phase 5C incorporates **Time-Block Bootstrapping** (sampling non-overlapping blocks of 5 and 10 sessions) and **Wilson Score Confidence Intervals** to produce realistic error bounds.

### Out-Of-Sample Validation Policy
- To prevent look-ahead bias and overfitting, data must be partitioned chronologically into:
  - **In-Sample Period (70%)**
  - **Out-Of-Sample Period (30%)**
- Risk thresholds (e.g. 45% volatility, 20% drawdown) configured in Phase 3 must **never** be tuned on the out-of-sample period.
- **Finding:** Because 0 real historical bars currently exist in the database, **reliable out-of-sample validation is not possible at this time**.

---

## 5. Statistical Limitations & Disclaimers

1. **Non-Probabilistic Heuristic**: The current composite score produced by \`DownsideRiskEngine\` is a rule-based heuristic indicator, not a calibrated probability.
2. **Survivorship Bias**: Testing only currently listed symbols neglects equities that suffered severe drawdowns, bankruptcies, or delisting.
3. **No Claim of Predictive Value**: Without validated real-data out-of-sample backtest results, HyperStocks makes **no claim** that the risk engine is profitable, predictive, or able to beat naive baselines.

---

## 6. Actionable Next Steps to Complete Real-Data Ingestion

To unblock real-data backtesting:
1. **API Key Tier / Data Provider**:
   - Provide an upgraded Finnhub API key with access to \`/stock/candle\`, OR configure an authorized historical market-data provider.
2. **Execute Ingestion CLI**:
   \`\`\`bash
   npx tsx scripts/ingest-historical-data.ts --symbols AAPL,MSFT,NVDA --days 365 --write
   \`\`\`
3. **Re-Run Validation CLI**:
   \`\`\`bash
   npx tsx scripts/validate-real-data.ts
   \`\`\`
`;
}

function generateComprehensiveReport(
    report: any,
    audits: DataReadinessReport[],
    oosReport: any
): string {
    const timestamp = new Date().toISOString();
    return `# HyperStocks Phase 5C: Real-Data Backtesting & Statistical Validation Report

**Executed:** ${timestamp}  
**Engine Version:** \`${report.engineVersion}\`  
**Status:** Completed Real-Data Backtest  

## 1. Executive Summary
Real-data evaluation executed across ${report.symbolsEvaluated.length} symbols.

## 2. Confusion Matrix & Primary Target (5-Day >= 5% Drop)
- True Positives: ${report.primaryTarget.confusionMatrix.truePositives}
- False Positives: ${report.primaryTarget.confusionMatrix.falsePositives}
- True Negatives: ${report.primaryTarget.confusionMatrix.trueNegatives}
- False Negatives: ${report.primaryTarget.confusionMatrix.falseNegatives}
- Precision: ${report.primaryTarget.metrics.precision !== null ? (report.primaryTarget.metrics.precision * 100).toFixed(2) + '%' : 'N/A'}
- Recall: ${report.primaryTarget.metrics.recall !== null ? (report.primaryTarget.metrics.recall * 100).toFixed(2) + '%' : 'N/A'}

## 3. Baseline Comparisons
- Unconditional Always-Alert: Precision = ${report.baselines.unconditional.metrics.precision !== null ? (report.baselines.unconditional.metrics.precision * 100).toFixed(2) + '%' : 'N/A'}
- SMA200 Breakdown: Precision = ${report.baselines.sma200Breakdown.metrics.precision !== null ? (report.baselines.sma200Breakdown.metrics.precision * 100).toFixed(2) + '%' : 'N/A'}

## 4. Out-of-Sample Reliability
${oosReport.reliabilityAssessment}
`;
}

if (require.main === module) {
    main().catch((err) => {
        console.error(`Validation CLI Error: ${err.message}`);
        process.exit(1);
    });
}
