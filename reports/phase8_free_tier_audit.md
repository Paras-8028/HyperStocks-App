# HyperStocks Phase 8: Free-Tier Audit Report

**Date:** October 2026  
**Auditor:** HyperStocks Core Engineering  
**Scope:** Architectural and Operational Audit of Provider Free-Tiers, Costs, Limits, Quotas, and Failure Modes.

---

## 1. Executive Summary

This audit evaluates all external integrations, background tasks, database models, caching mechanisms, and credentials across HyperStocks to guarantee zero operational costs, eliminate redundant network traffic, prevent quota burn, protect private credentials, and support graceful degradation when free-tier quotas are exhausted.

HyperStocks relies strictly on legitimate free-tier service allocations:
1. **Finnhub**: Free Tier (30–60 API calls/min). Free tier does not include `/stock/candle` historical bars (returns HTTP 403 Forbidden).
2. **Google Gemini**: Free Tier (15 RPM, 1,500 RPD, 1M TPM on `gemini-2.5-flash-lite` / `gemini-3.5-flash`).
3. **MongoDB Atlas**: M0 Shared Free Tier (512 MB storage, shared RAM, max 500 connections).
4. **Inngest Cloud**: Free Tier (25,000 steps/month).
5. **Vercel**: Hobby Free Plan (max 1 cron job execution per day).
6. **Clerk**: Free Tier (10,000 Monthly Active Users).
7. **Gmail SMTP / Nodemailer**: Free Personal Account (500 outgoing emails/day limit).

---

## 2. Comprehensive Service & Integration Audit Matrix

| Service & Integration | Current Implementation | Free-Tier Quota & Limits | Potential Cost or Quota Risk | Recommended Action | Required for Core? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Finnhub Market Data** (`FinnhubMarketService`) | Quote (`/quote`), Profile (`/stock/profile2`), Metrics (`/stock/metric`), Peers (`/stock/peers`), Search (`/search`). | 30–60 calls/minute. | Burst rate limits (HTTP 429) during simultaneous ticker fetches. Repeated client fetches on re-renders. | Implement in-memory request deduplication (in-flight promise coalescing), extend cache TTLs, enforce exponential backoff on 429s. | **Yes** (Stock analysis & alerts) |
| **Finnhub Historical Candles** (`/stock/candle`) | `getCandles` calls `/stock/candle` for daily OHLCV bars. | **Not supported on free tier** (returns HTTP 403 Forbidden). | Repeated calls to an endpoint known to return 403 waste request bandwidth and add latency. | Introduce a 403 circuit breaker / availability cache for `/stock/candle`. Return structured `HISTORICAL_CANDLES_UNAVAILABLE` immediately without making futile HTTP requests. Keep evaluation operational with honest `NO_HISTORICAL_RECORDS` status. | **No** (Optional for live quotes; evaluation degrades honestly) |
| **Finnhub Company News** (`FinnhubNewsService`) | `/company-news` & `/news` for market headlines. | Shared with Finnhub minute limit. | Excessive polling when background collector or users fetch news for multiple tickers. | Batch symbols in bounded chunks (max 2–3 concurrent), throttle with 350ms delays, cache responses for 300s. | **Yes** (News intelligence & sentiment) |
| **Google Gemini API** (`GeminiProvider`, `GeminiAIService`) | Structured extraction, news impact synthesis, personalized market briefings. | 15 RPM, 1,500 RPD on free tier. | Quota exhaustion (HTTP 429 / resource exhausted). Retrying during quota exhaustion burns quotas and blocks user UI. | Cache AI summaries by content hash + model + prompt version. Check MongoDB before calling Gemini. When quota is exhausted, immediately invoke deterministic fallback (`isAIGenerated: false, isFallback: true`) without waiting for timeouts. | **Yes** (Graceful fallback to deterministic analysis required) |
| **MongoDB Atlas** (`database/mongoose.ts`) | Next.js serverless connection pool (`global.mongooseCache`), Mongoose models. | 512 MB storage, 500 max connections, shared CPU/RAM. | Unbounded query result sets; redundant index creation; serverless connection leak if `mongoose.connect` is called outside cached handler. | Maintain singleton connection cache with `serverSelectionTimeoutMS: 8000`. Enforce `.lean()` on read-only queries. Bound results (`.limit()`, `.slice()`). Ensure compound unique indexes prevent duplicate documents. | **Yes** (Application persistence) |
| **Inngest Background Engine** (`lib/inngest/`) | Cron functions for news collection (`0 */2 * * 1-5`), downside risk (`0 */4 * * 1-5`), price checks (`*/2 * * * *`), daily digests (`0 * * * *`). | 25,000 steps/month on Free Tier. | Running `price-check` every 2 minutes consumes ~21,600 steps/month, risking free-tier step exhaustion! | Align price-check frequency with active market hours or adjust cadence. Prevent overlapping runs with in-memory execution guards. Limit retries to 2 with exponential backoff. | **Yes** (Background automation) |
| **Vercel Cron Deployment** (`vercel.json`) | `vercel.json` defines `"schedule": "*/5 * * * *"` on `/api/cron/process-alerts`. | **Vercel Hobby plan supports at most 1 cron execution per day!** | Deployments will fail with error: `A cron expression with frequency greater than once per day is not allowed on Hobby plan`. Additionally duplicates Inngest price-check. | Adjust `vercel.json` schedule to run once daily (`0 14 * * 1-5` - 09:00 ET market open) as a fallback ping, or rely on Inngest as primary scheduler. Avoid duplicate concurrent triggers. | **No** (Inngest is primary scheduler; Vercel cron is fallback) |
| **Gmail SMTP (Nodemailer)** (`lib/nodemailer`, `EmailService`) | Welcome emails, daily digests, downside risk alerts. | 500 outgoing emails/day on free consumer Gmail. | Exceeding 500 emails/day causes temporary 24h Gmail account suspension. Duplicate emails during task retries. | Strict idempotency keys (`DigestDeliveryLogModel`, `AlertDeliveryLogModel`). Cooldown periods (24h per condition). Safe simulation mode when SMTP credentials are unconfigured or in development/test. Never send real emails in automated test suites. | **Yes** (Alert notifications) |
| **Clerk Authentication** (`@clerk/nextjs`) | User auth, session tokens, webhooks (`/api/webhooks/clerk`). | 10,000 Monthly Active Users (MAUs). | Unverified webhook endpoints allowing forged user events. Exposing secret keys. | Strict `svix` cryptographic signature verification on `CLERK_WEBHOOK_SECRET`. Read credentials strictly from server environment variables. | **Yes** (Authentication & user identity) |
| **Client-Side WebSocket** (`lib/finnhub/ws.ts`, `socket.ts`) | Finnhub WebSocket connection for real-time trade ticks. | 50 simultaneous WebSocket connections on Finnhub free tier. | Exposing `NEXT_PUBLIC_FINNHUB_API_KEY` in client bundle; multiple open tabs exhausting 50 connection limit. | Document client key requirement; ensure server-only private keys (`FINNHUB_API_KEY`) are never prefixed with `NEXT_PUBLIC_`. Provide single shared client connection per browser tab. | **No** (Optional live quote enhancement; REST fallback works) |

---

## 3. Potential Cost & Quota Failure Modes

1. **Finnhub 403 Infinite Retries**: Previous attempts to ingest historical candles via `/stock/candle` returned HTTP 403. Without an availability circuit breaker, recurring jobs repeatedly query the unavailable endpoint, generating log noise and consuming quota needlessly.
2. **Gemini 429 Quota Cascades**: When Google Gemini exhausts its free daily quota (1,500 requests), repeated calls block UI threads or fail with 503/429. The application must identify active cooldowns instantly and switch to deterministic rule-based analysis without degrading user experience.
3. **Inngest Free Step Budget**: An Inngest cron job triggering every 2 minutes executes 30 times an hour $\times$ 24 hours $\times$ 30 days = 21,600 runs, nearly consuming the entire 25,000 monthly free tier quota on a single task alone. Cadence must be calibrated to market hours.
4. **Vercel Hobby Cron Restriction**: Deploying a `vercel.json` with a 5-minute interval (`*/5 * * * *`) on a free Hobby tier will fail Vercel deployment validations.
5. **Credential Leakage via `NEXT_PUBLIC_`**: Secrets such as `GEMINI_API_KEY`, `MONGODB_URI`, `CLERK_SECRET_KEY`, `SMTP_PASSWORD`, and `CRON_SECRET` must strictly remain server-side.

---

## 4. Remediation Plan

1. **Finnhub Circuit Breaker & Request Deduplication**:
   - Cache negative 403 responses for `/stock/candle` (6-hour circuit breaker) so neither client nor background jobs invoke the blocked candle endpoint repeatedly.
   - Implement in-flight promise coalescing in `ApiClient` to deduplicate simultaneous requests for identical URLs.
2. **Gemini Analysis Cache & Quota Guard**:
   - Add persistent/content-hash cache in `WatchlistNewsSummarizer` so articles already analyzed in MongoDB or memory are reused directly.
   - Immediate bypass to deterministic fallback when `aiCooldownTracker` reports active cooldown, saving token quota.
3. **Vercel Cron Calibration**:
   - Update `vercel.json` to once-daily market open trigger (`0 14 * * 1-5`) compatible with Vercel Hobby plan.
4. **Unified Health & Status Service (`SystemStatusService`)**:
   - Provide `GET /api/status` reporting real-time status of Finnhub, Gemini cooldown, MongoDB connection, Inngest collector, and historical price readiness without making paid diagnostic calls or exposing secrets.
5. **Documentation & Env Integrity**:
   - Update `.env.example` with `CLERK_WEBHOOK_SECRET` and document free-tier assumptions.
