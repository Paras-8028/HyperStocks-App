# Gemini API Reliability, Quota Handling & Architecture Guide

## 1. Executive Summary & Root Cause Analysis

### Error A: Gemini API 503 (`AI_TEMPORARILY_OVERLOADED`)
```text
Gemini API error (503): This model is currently experiencing high demand.
Spikes in demand are usually temporary. Please try again later.
```
* **Root Cause**: The Google Gemini API occasionally experiences high-demand spikes on specific model endpoints (e.g. `gemini-2.5-flash-lite`, `gemini-3.5-flash`). Previously, when a 503 occurred, the provider immediately attempted the next model without exponential backoff or jitter, failing under transient cluster pressure and dropping connections abruptly.
* **Resolution**: Implemented controlled retries for transient 503 errors using **exponential backoff with randomized jitter** (up to 2 retry attempts, `baseDelay: 1000ms`, `jitter: 0-500ms`). Only transient errors are retried; if all retries are exhausted on the primary model, a fallback model is tested before returning a standardized, user-friendly response.

---

### Error B: Gemini API 429 (`AI_QUOTA_EXCEEDED` vs `AI_RATE_LIMITED`)
```text
Gemini API error (429): You exceeded your current quota.
Quota exceeded for metric:
generativelanguage.googleapis.com/generate_content_free_tier_requests

Model: gemini-3.8-flash
```
* **Root Cause**: 
  1. **Quota Cascade Loop**: Free-tier / daily request quotas (`generate_content_free_tier_requests`) apply to the **API Key / Google Cloud project**, NOT individual model names. When a quota was exhausted, `GeminiProvider` and `GeminiAIService` iterated through all candidate models (`gemini-2.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.7-flash`, etc.), blasting Google with 4 consecutive 429 errors in milliseconds.
  2. **Uncached Re-renders & Strict Effects**: In `StockIntelligencePage.tsx`, `useEffect` triggered an AI request on every component mount or symbol switch without client-side or server-side caching.
  3. **No Cooldown Guard**: When 429 was returned, subsequent page navigations and clicks immediately hit Google again, amplifying quota exhaustion.
  4. **Status Code Flattening**: API routes caught 429 errors and re-emitted them as `{ status: 500 }`, preventing frontend components from detecting rate limits and `Retry-After` headers.
  5. **Prompt History Corruption**: In `useFinancialAssistant.ts`, raw error strings were saved into the assistant chat history, feeding broken error messages back into the LLM on subsequent turns.
* **Resolution**:
  - Implemented `parseGeminiError` to distinguish project-level quota exhaustion (`AI_QUOTA_EXCEEDED`) from short-term rate limits (`AI_RATE_LIMITED`).
  - Added `aiCooldownTracker`: When quota exhaustion is detected, a cooldown is registered (from Google's `RetryInfo.retryDelay` or `Retry-After`, defaulting to 300s). All incoming requests return the structured cooldown error immediately without calling Google.
  - Eliminated the model cascade loop on quota exhaustion: provider halts immediately on 429.
  - Added server-side TTL caching (`aiAnalysisCache`) and in-flight request deduplication.
  - Added client-side session caching (15-min TTL) and live countdown timer on retry buttons in `StockIntelligencePage.tsx`.
  - Added `isSendingRef` and error message filtering in `useFinancialAssistant.ts`.

---

## 2. Centralized Server-Side Error Handling

File: [services/ai/aiErrorHandling.ts](file:///c:/Users/patil/OneDrive/Desktop/HyperStocks/services/ai/aiErrorHandling.ts)

Standardized response envelope:
```json
{
  "success": false,
  "error": {
    "code": "AI_QUOTA_EXCEEDED",
    "message": "AI analysis is temporarily unavailable because the API usage quota has been reached. Please check back later.",
    "status": 429,
    "retryable": false,
    "retryAfterSeconds": 300,
    "model": "gemini-2.5-flash-lite"
  }
}
```

### Error Code Categorization

| HTTP Status | Error Code | Category | Retryable | Behavior |
|---|---|---|---|---|
| **429** | `AI_QUOTA_EXCEEDED` | Free-tier / daily limit reached | **No** | Halts immediately. Sets 300s cooldown. UI displays advisory notice with countdown. |
| **429** | `AI_RATE_LIMITED` | Requests-Per-Minute limit | **Yes** | Halts immediately. Sets short cooldown (30s). User may retry after cooldown. |
| **503** | `AI_TEMPORARILY_OVERLOADED` | Model experiencing high demand | **Yes** | Server retries with exponential backoff & jitter (max 2 attempts). UI provides retry. |
| **401 / 403** | `AI_AUTH_ERROR` | Missing or invalid GEMINI_API_KEY | **No** | Halts immediately. Informs administrator to check environment config. |
| **400** | `AI_INVALID_REQUEST` | Malformed JSON or context overflow | **No** | Rejects invalid request. No retries. |
| **500 / 502 / 504** | `AI_SERVICE_ERROR` | Upstream network or server error | **Depends** | Returns friendly message with retry capability. |

---

## 3. Quota Exhaustion & Cooldown Tracker

File: [services/ai/aiErrorHandling.ts](file:///c:/Users/patil/OneDrive/Desktop/HyperStocks/services/ai/aiErrorHandling.ts) (`aiCooldownTracker`)

1. **Active Quota Interception**: When Google returns a 429 with `RESOURCE_EXHAUSTED` or `free_tier_requests`:
   - `aiCooldownTracker.registerError(parsedError)` activates cooldown for `retryAfterSeconds`.
   - Any new incoming request checks `aiCooldownTracker.getActiveCooldownError()`. If active, it returns HTTP 429 immediately without touching Google's API.
2. **Zero Model Burn**: Model iteration terminates immediately on 429, preserving remaining quota.
3. **No Automatic Quota Retries**: The system never runs auto-retry loops on exhausted quotas.

---

## 4. Transient 503 Retries with Backoff & Jitter

File: [services/ai/providers/GeminiProvider.ts](file:///c:/Users/patil/OneDrive/Desktop/HyperStocks/services/ai/providers/GeminiProvider.ts)

```ts
function calculateBackoffDelay(attempt: number, serverRetryAfterSeconds?: number): number {
    if (serverRetryAfterSeconds && serverRetryAfterSeconds > 0) {
        return serverRetryAfterSeconds * 1000;
    }
    const baseDelay = AI_CONFIG.transientRetryDelayMs; // 1000ms
    const exponential = baseDelay * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 500); // 0-500ms randomized jitter
    return exponential + jitter;
}
```
- Attempt 1: ~1000ms - 1500ms
- Attempt 2: ~2000ms - 2500ms
- Maximum attempts: 2 after initial request (`AI_CONFIG.maxTransientRetries`).

---

## 5. Caching and Request Deduplication

1. **Server-Side Cache (`aiAnalysisCache`)**:
   - `detailed_stock_intelligence:${symbol}`: 30-minute TTL.
   - `stock_thesis:${symbol}`: 30-minute TTL.
   - `market_briefing:${userId}:${symbols}`: 30-minute TTL.
   - Re-running page views or concurrent users requesting the same stock reuse cached analysis.
2. **In-Flight Request Deduplication**:
   - If 3 components or users request `AAPL` detailed intelligence simultaneously, `aiAnalysisCache.deduplicate()` shares a single promise, issuing **1 API call** instead of 3.
3. **Client-Side Session Cache**:
   - `StockIntelligencePage.tsx` maintains a 15-minute in-memory cache. Navigating between stock tickers and returning does not trigger duplicate API calls.
   - "Regenerate Analysis" explicitly passes `forceRefresh: true` to bypass caches on demand.

---

## 6. Financial Assistant Improvements

File: [features/ai-assistant/useFinancialAssistant.ts](file:///c:/Users/patil/OneDrive/Desktop/HyperStocks/features/ai-assistant/useFinancialAssistant.ts)

- **Prompt Hygiene**: Failed queries and error bubbles are tagged with `isError: true` and excluded from `apiMessages` sent to Gemini, preventing prompt poisoning.
- **Double-Click Protection**: `isSendingRef` blocks duplicate rapid clicks and Enter key submissions.
- **Interactive In-Bubble Retry**: Error notices feature a stylized "Retry Question" button when the error is retryable.
- **Streaming Fallback**: When streaming fails with quota or auth errors, the route handler returns the error code immediately rather than falling back to a duplicate non-streaming call.

---

## 7. Security & API Credential Protection

- **Server-Side Only**: `GEMINI_API_KEY` is loaded exclusively in server runtime (`process.env.GEMINI_API_KEY`).
- **No `NEXT_PUBLIC_` Exposure**: Verified zero occurrences of `NEXT_PUBLIC_GEMINI` or `GEMINI_API_KEY` in client-side bundles.
- **URL Parameter Sanitization**: All error parser outputs automatically sanitize query strings (`key=[REDACTED]`).

---

## 8. Configuration Settings

File: [config/ai.ts](file:///c:/Users/patil/OneDrive/Desktop/HyperStocks/config/ai.ts)

```ts
export const AI_CONFIG = {
    provider: 'gemini' as const,
    defaultModel: 'gemini-2.5-flash-lite',
    fallbackModel: 'gemini-3.5-flash',
    candidateModels: [
        'gemini-2.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.7-flash',
        'gemini-flash-latest',
    ],
    temperature: 0.2,
    maxTokens: 4096,
    timeoutMs: 25000,
    maxTransientRetries: 2,               // Max retries on 503
    transientRetryDelayMs: 1000,          // Base backoff in ms
    defaultQuotaCooldownSeconds: 300,     // 5-minute cooldown on 429 quota exhaustion
    defaultRateLimitCooldownSeconds: 30,  // 30-second cooldown on 429 RPM limit
    stockAnalysisCacheTtlMs: 30 * 60 * 1000, // 30-minute server cache
    ...
};
```
