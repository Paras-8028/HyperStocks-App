# HyperStocks — AI-Powered Stock Intelligence Platform

HyperStocks is a personalized, AI-native financial operating system and market intelligence dashboard built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Google Gemini 2.5 AI, Finnhub Financial Data, TradingView Lightweight Charts, MongoDB (Mongoose), and Clerk Authentication.

---

## 🔐 Clerk Authentication Integration

HyperStocks uses **Clerk** (`@clerk/nextjs`) as the authentication provider and single source of truth for user identity.

### Architecture & Security Highlights:
- **Zero Credential Leakage**: Clerk secret keys and sensitive JWT credentials are strictly confined to server-side environments and never exposed to the client or embedded in AI prompt contexts.
- **Clerk User ID as Primary Key**: All user-specific database models (Watchlists, Portfolios, Smart Alerts, Alert Preferences, Personalization Engine Profiles) are keyed on the immutable Clerk User ID (`userId`, e.g. `user_2...`), eliminating dependency on mutable email addresses or insecure client-generated identifiers.
- **Route Protection Middleware**: `middleware.ts` employs Clerk's `clerkMiddleware` and `createRouteMatcher` to enforce authentication across all application and API routes while preserving public access for authentication endpoints and webhooks.
- **Seamless Dark Fintech Styling**: Clerk `<SignIn />`, `<SignUp />`, and `<UserButton />` components are themed with `@clerk/themes` dark theme, customized with HyperStocks emerald accents (`#10b981`), zinc glassmorphic backgrounds (`#0b0f17`), and border styling.

---

## 🛠️ Environment Variables Configuration

Copy `.env.example` to `.env` and populate the required API credentials:

```bash
cp .env.example .env
```

### Required Variables:

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key (from Clerk Dashboard) |
| `CLERK_SECRET_KEY` | Clerk Secret Key (server-only) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Default: `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Default: `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Default: `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Default: `/` |
| `MONGODB_URI` | MongoDB connection string |
| `GEMINI_API_KEY` | Google Gemini API Key for AI Financial Assistant & Intelligence Engine |
| `FINNHUB_API_KEY` | Finnhub API Key for real-time stock quotes, news, and company profiles |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm run start
```

---

## 🛡️ Route Protection Architecture

- **Public Routes**:
  - `/sign-in(.*)` — Clerk Sign-In flow
  - `/sign-up(.*)` — Clerk Sign-Up flow
  - `/api/inngest(.*)` — Inngest background job webhook endpoint
  - `/assets/(.*)` & Static Assets — Public icons, logos, and stylesheets
- **Protected Routes**:
  - `/` (Dashboard / Daily Briefing)
  - `/stocks/[symbol]` (AI Stock Intelligence & Deep Technicals)
  - `/watchlist` (Personalized Watchlists)
  - `/portfolio` (Portfolio Intelligence & Risk Analytics)
  - `/news` (AI News Intelligence & Impact Detection)
  - All `/api/*` routes (AI Assistant, Analytics, Portfolio, Alerts, Preferences) return `401 Unauthorized` for unauthenticated requests.

---

## 📊 Key Features

1. **AI Financial Assistant**: Interactive conversational intelligence powered by Gemini 2.5, grounded in live Finnhub market quotes.
2. **Personalized Intelligence Engine**: User profiles adjust risk alerts, news priority, and portfolio analysis based on risk tolerance, investment horizon, and style.
3. **Smart Alert Center**: Multidimensional price, volume, technical, earnings, and news alerts explaining *why* an event matters.
4. **Portfolio Risk Intelligence**: Real-time concentration analysis, volatility metrics, sector exposure, and automated AI portfolio breakdowns.
5. **AI News Impact Engine**: Real-time financial news classified by sentiment, tickers impacted, and direct portfolio relevance.

---

## 📧 Email Notification & AI Alert Intelligence System

HyperStocks includes an institutional-grade email briefing engine powered by **Nodemailer** for SMTP delivery and **Clerk** for user identity resolution.

### Architecture Overview
```
Clerk Authenticated User
          ↓
     User Email
          ↓
HyperStocks Alert Engine (Price, Movement, Volume, Technical, News, Earnings, Risk, AI Insight)
          ↓
   Context Collector (Quotes, Fundamentals, Benchmark Indices, Portfolio, Watchlist, News)
          ↓
     AI Synthesis (Google Gemini — strictly factual, zero hallucinated numbers)
          ↓
   Email Templates (Dark institutional fintech HTML, responsive, mobile-optimized)
          ↓
Nodemailer Transporter (Configurable SMTP / Gmail App Password)
          ↓
     User Inbox
```

### SMTP Configuration

In your `.env` file, configure your SMTP server credentials:

```bash
# Standard SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM_EMAIL="alerts@hyperstocks.app"
SMTP_FROM_NAME="HyperStocks Intelligence"

# Cron Security Token
CRON_SECRET="your_secure_cron_secret_token"
```

#### Setting up Gmail SMTP for Development:
1. Enable **2-Step Verification** on your Google Account: [Google Security Settings](https://myaccount.google.com/security)
2. Generate an **App Password**: [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and "Other (Custom name: HyperStocks)"
4. Copy the generated 16-character password into `SMTP_PASSWORD="xxxx xxxx xxxx xxxx"`.
5. Set `SMTP_HOST="smtp.gmail.com"` and `SMTP_PORT="465"`.

### Scheduled Alert Processing & Daily Digest

HyperStocks includes server-side cron endpoints configured for Vercel Cron or custom schedulers:

1. **Active Price & Smart Alerts**:
   - Route: `GET /api/cron/process-alerts`
   - Header: `Authorization: Bearer <CRON_SECRET>`
   - Evaluates active price target thresholds, enforces 1-hour cooldown and price-crossing deduplication, generates AI synthesis, and delivers notifications.

2. **Daily Morning AI Intelligence Digest**:
   - Route: `GET /api/cron/daily-digest`
   - Header: `Authorization: Bearer <CRON_SECRET>`
   - Dispatches a personalized morning market briefing at 8:30 AM with index benchmarks, watchlist movers, portfolio risk notices, and top news.

### Development Email Testing

You can safely test email generation and delivery for the currently authenticated user:

```bash
# Send a test price alert to the currently authenticated user
curl -X POST http://localhost:3000/api/alerts/test-email \
  -H "Content-Type: application/json" \
  -d '{"type": "price"}'

# Send a test daily digest
curl -X POST http://localhost:3000/api/alerts/test-email \
  -H "Content-Type: application/json" \
  -d '{"type": "daily_digest"}'
```

*(Note: The test endpoint requires an active Clerk authenticated session and strictly sends to the verified email of the logged-in user. Arbitrary recipient parameters are rejected for security.)*

