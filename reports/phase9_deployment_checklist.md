# HyperStocks Phase 9: Production Deployment Checklist

**Status:** Pre-Deployment Audit Completed | Application Build & Regression Verified  
**Operating Cost Target:** $0.00 / Month under verified Free-Tier Quotas

---

## 1. Required Environment Variables (Names Only)

The following server-side environment variables must be defined in the production hosting dashboard (e.g. Vercel Project Settings $\rightarrow$ Environment Variables). Never commit real secret values to Git.

### Core Environment
- `NODE_ENV` (`production`)
- `NEXT_PUBLIC_BASE_URL` (Public canonical application URL, e.g., `https://hyperstocks.vercel.app`)

### Clerk Authentication
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Public client key)
- `CLERK_SECRET_KEY` (Server secret key)
- `CLERK_WEBHOOK_SECRET` (Svix webhook signing secret starting with `whsec_`)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`/sign-in`)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (`/sign-up`)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` (`/`)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` (`/`)

### Database Connection
- `MONGODB_URI` (MongoDB connection URI with replica set and database name specified)

### Market Data Feeds
- `FINNHUB_API_KEY` (Finnhub API token for server-side quote and news requests)
- `NEXT_PUBLIC_FINNHUB_API_KEY` (Client-side token for search and quote widgets)

### AI Intelligence
- `AI_PROVIDER` (`gemini`)
- `GEMINI_API_KEY` (Google AI Studio Gemini API Key)

### Email Delivery (Gmail SMTP)
- `SMTP_HOST` (`smtp.gmail.com`)
- `SMTP_PORT` (`465` or `587`)
- `SMTP_USER` (Sending email address)
- `SMTP_PASSWORD` (Google 16-character App Password, NOT user account password)
- `SMTP_FROM_EMAIL` (Sender address)
- `SMTP_FROM_NAME` (`HyperStocks Intelligence`)

### Cron Security
- `CRON_SECRET` (Cryptographically random bearer token for Vercel Cron and external dispatcher authentication)

---

## 2. Clerk Webhook Configuration

1. Log in to the [Clerk Dashboard](https://dashboard.clerk.com).
2. Navigate to **Configure $\rightarrow$ Webhooks**.
3. Click **Add Endpoint**.
4. Set Endpoint URL to:
   ```
   https://<your-production-domain>/api/webhooks/clerk
   ```
5. Subscribe to the following event types:
   - `user.created`
   - `user.updated`
   - `user.deleted`
6. Copy the **Signing Secret** (starts with `whsec_`) into the production environment variable `CLERK_WEBHOOK_SECRET`.
7. Verify that the endpoint returns HTTP 200 on test ping from Clerk Dashboard.

---

## 3. MongoDB Connectivity Requirements

1. **Atlas Tier**: Compatible with MongoDB Atlas M0 (Free 512MB storage, 500 connections).
2. **Network Access**: Add `0.0.0.0/0` (Allow Access from Anywhere) in Network Access to permit serverless IP connections from Vercel lambdas.
3. **Database User**: Create a dedicated database user with `readWrite` permissions on the `hyperstocks` database.
4. **Connection Pooling**: Mongoose connection caching in `database/mongoose.ts` is configured to reuse connections across serverless invocations.

---

## 4. Inngest Deployment & Synchronization

1. Create a free account at [Inngest Cloud](https://app.inngest.com).
2. Add your production application URL under **Apps $\rightarrow$ Connect Webhook**:
   ```
   https://<your-production-domain>/api/inngest
   ```
3. Verify that Inngest discovers the 3 registered background functions:
   - `price-alert-check` (`*/10 13-21 * * 1-5`)
   - `news-sentiment-collection` (`0 14 * * 1-5`)
   - `downside-risk-evaluation` (`30 21 * * 1-5`)
4. **Market Hours Verification**: The price check schedule `*/10 13-21 * * 1-5` executes strictly during US regular trading hours (13:00 to 21:50 UTC, Mon–Fri), fully covering both Eastern Daylight Time (EDT, UTC-4) and Eastern Standard Time (EST, UTC-5) with safe market-open buffers.

---

## 5. Vercel Build & Cron Requirements

1. **Framework Preset**: Next.js.
2. **Build Command**: `next build` (or `npm run build`).
3. **Node.js Version**: 20.x or 22.x LTS.
4. **Cron Configuration**: Defined in `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/daily-digest",
         "schedule": "0 14 * * 1-5"
       }
     ]
   }
   ```
   *Note: Strictly 1 cron execution per weekday at 14:00 UTC (09:00 AM ET), fully compliant with Vercel Hobby's limit of maximum 1 cron per day.*

---

## 6. SMTP Configuration Requirements

1. **Provider**: Gmail SMTP.
2. **2-Factor Authentication**: Must be enabled on the sending Google account.
3. **App Password**: Generate a 16-character App Password at [Google Security](https://myaccount.google.com/apppasswords).
4. **Daily Quotas**: Gmail personal accounts allow up to 500 emails/day. HyperStocks prevents repeat sending via `lastDigestSentDate` in `UserPreferenceModel`.

---

## 7. Health Check Endpoints

| Endpoint | Method | Public / Protected | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/status` | `GET` | Public | Comprehensive health check: DB latency, Finnhub accessibility, Gemini quota state, collector status, and provenance legend. Zero secret exposure. |
| `/api/inngest` | `GET` / `POST` | Public / Inngest-signed | Inngest function schema reflection and dispatch webhook. |
| `/api/webhooks/clerk` | `POST` | Svix-signed | Clerk user lifecycle synchronization. |

---

## 8. Safe Deployment Steps

1. **Pre-Push Validation**:
   - Run `npx tsc --noEmit` locally to guarantee zero type errors.
   - Run `npx tsx tests/phase9_production_readiness.test.ts` to verify security invariants.
2. **Git Deployment**:
   - Push commit to primary repository branch connected to Vercel.
3. **Build Monitoring**:
   - Inspect Vercel deployment logs for static page compilation and middleware bundling.
4. **Rollback Strategy**:
   - If deployment fails or runtime errors emerge, navigate to **Vercel Dashboard $\rightarrow$ Deployments**, locate the last verified working build, and click **Instant Rollback**.

---

## 9. Post-Deployment Verification Procedures

Execute the following checks immediately after deployment:

1. **Status Endpoint Check**:
   ```bash
   curl -s https://<your-domain>/api/status
   ```
   - Verify `status: 200`
   - Verify `overallHealth: "healthy"` or `"limited"`
   - Confirm zero API keys or MongoDB strings appear in the output.
2. **Authentication Flow**:
   - Visit `/sign-in` and sign in with test credentials.
   - Verify redirection to `/overview`.
3. **Watchlist Journey**:
   - Navigate to `/stocks` $\rightarrow$ search for `AAPL`.
   - Toggle watchlist bookmark; verify persistence on `/watchlist`.
4. **News Intelligence Journey**:
   - Navigate to `/news`.
   - Verify news headlines render with sentiment badges (`bullish`, `bearish`, `neutral`, `mixed`).
   - If Gemini is rate-limited, verify fallback cards display with `Deterministic Heuristic` tag.
5. **AI Assistant Journey**:
   - Navigate to `/ai-assistant` and submit a test query (e.g., "Summarize Apple's latest catalyst").
   - Verify responsive streamed or completed copilot response.
6. **Settings Page**:
   - Navigate to `/settings`.
   - Test updating delivery timezone; confirm save toast notification.
