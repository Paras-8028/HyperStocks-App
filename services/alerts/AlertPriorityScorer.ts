import { SmartAlertItem, SmartAlertSeverity } from '@/types/alerts';

interface PriorityContext {
    portfolioSymbols?: string[];
    watchlistSymbols?: string[];
}

const SEVERITY_WEIGHTS: Record<SmartAlertSeverity, number> = {
    critical: 40,
    warning: 25,
    info: 15,
    advisory: 10,
};

/**
 * Calculates a 0-100 priority score for a smart alert item based on:
 * - Base severity (up to 40 pts)
 * - User relevance: Portfolio holding (+25 pts) or Watchlist asset (+15 pts)
 * - Unread status (+15 pts)
 * - Recency: < 2 hours (+15 pts), < 12 hours (+10 pts), < 24 hours (+5 pts)
 * - Category modifier (+5 pts for portfolio_risk, earnings, critical technicals)
 */
export function calculatePriorityScore(
    alert: Pick<SmartAlertItem, 'category' | 'severity' | 'timestamp' | 'isRead' | 'relatedSymbol'>,
    context?: PriorityContext
): number {
    let score = 0;

    // 1. Severity weight (10 - 40)
    score += SEVERITY_WEIGHTS[alert.severity] || 10;

    // 2. User relevance context
    const symbol = alert.relatedSymbol?.toUpperCase();
    if (symbol) {
        if (context?.portfolioSymbols?.some(s => s.toUpperCase() === symbol)) {
            score += 25; // Direct financial stake
        } else if (context?.watchlistSymbols?.some(s => s.toUpperCase() === symbol)) {
            score += 15; // Tracked asset
        }
    }

    // 3. Category criticalness
    if (alert.category === 'portfolio_risk') {
        score += 8;
    } else if (alert.category === 'earnings') {
        score += 5;
    }

    // 4. Unread status
    if (!alert.isRead) {
        score += 12;
    }

    // 5. Recency
    const ageHours = (Date.now() - alert.timestamp) / (1000 * 60 * 60);
    if (ageHours <= 2) {
        score += 10;
    } else if (ageHours <= 12) {
        score += 6;
    } else if (ageHours <= 24) {
        score += 3;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Sorts alerts descending by priority score, with unread items prioritized on ties.
 */
export function sortAlertsByPriority(alerts: SmartAlertItem[]): SmartAlertItem[] {
    return [...alerts].sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
            return b.priorityScore - a.priorityScore;
        }
        if (a.isRead !== b.isRead) {
            return a.isRead ? 1 : -1;
        }
        return b.timestamp - a.timestamp;
    });
}
