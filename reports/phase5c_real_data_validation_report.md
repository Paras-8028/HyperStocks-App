# HyperStocks Phase 5C: Real-Data Backtesting & Statistical Validation Report

**Executed:** 2026-10-18T11:54:56.636Z  
**Status:** ⚠️ Complete Data Readiness Audit — Insufficient Real Market Data  
**Engine Version:** `1.0.0-phase3` (Backtest Harness: `1.0.0-phase5b`)  
**Evaluation Mode:** Read-Only Offline Execution (Zero Live API Calls, Zero Emails)

---

## 1. Executive Summary

Phase 5C evaluated the data readiness of HyperStocks' local historical database to validate whether the existing quantitative downside-risk engine provides useful early warnings on real market data.

**Key Findings:**
1. **Database Coverage:** The local MongoDB collection `historicalbars` currently contains **0 historical daily bars**.
2. **Data Sufficiency:** None of the requested watchlist symbols (`AAPL`) have the minimum **205 daily trading sessions** (200-day warmup for rolling SMAs + 5-day future target horizon) required for statistically meaningful evaluation.
3. **Provider Limitation Diagnostic:** Finnhub's free API tier returned `HTTP 403 Forbidden ("You don't have access to this resource.")` when accessing historical daily candle endpoints (`/stock/candle`).
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
| **AAPL** | 0 | None | 205 sessions | Passed (0 errors) | Split: No, Div: No | ❌ Excluded | Zero historical bars available in local dataset. |

---

## 3. Evaluation Targets & Methodology

When sufficient real market data is available, Phase 5C validates against two explicit downside targets:

### Target A (Primary): 5-Day $ge 5%$ Decline
$$Y(t) = 1 quad \text{if} quad \frac{\min(C[t+1], \dots, C[t+5])}{C[t]} - 1 \le -0.05$$
- Measures whether the stock closing price drops by at least 5% within the subsequent 5 **actual trading sessions**.
- Observations with fewer than 5 future trading sessions are labeled incomplete and excluded.

### Target B (Secondary): 10-Day $ge 8%$ Decline
$$Y_{10}(t) = 1 quad \text{if} quad \frac{\min(C[t+1], \dots, C[t+10])}{C[t]} - 1 \le -0.08$$
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

1. **Non-Probabilistic Heuristic**: The current composite score produced by `DownsideRiskEngine` is a rule-based heuristic indicator, not a calibrated probability.
2. **Survivorship Bias**: Testing only currently listed symbols neglects equities that suffered severe drawdowns, bankruptcies, or delisting.
3. **No Claim of Predictive Value**: Without validated real-data out-of-sample backtest results, HyperStocks makes **no claim** that the risk engine is profitable, predictive, or able to beat naive baselines.

---

## 6. Actionable Next Steps to Complete Real-Data Ingestion

To unblock real-data backtesting:
1. **API Key Tier / Data Provider**:
   - Provide an upgraded Finnhub API key with access to `/stock/candle`, OR configure an authorized historical market-data provider.
2. **Execute Ingestion CLI**:
   ```bash
   npx tsx scripts/ingest-historical-data.ts --symbols AAPL,MSFT,NVDA --days 365 --write
   ```
3. **Re-Run Validation CLI**:
   ```bash
   npx tsx scripts/validate-real-data.ts
   ```
