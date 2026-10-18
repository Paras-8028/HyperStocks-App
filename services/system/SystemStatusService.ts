import mongoose from 'mongoose';
import { connectToDatabase } from '@/database/mongoose';
import { FinnhubMarketService } from '@/services/market/FinnhubMarketService';
import { AI_CONFIG } from '@/config/ai';
import { aiCooldownTracker } from '@/services/ai/aiErrorHandling';
import { NewsSentimentCollectorService } from '@/services/news/NewsSentimentCollectorService';
import { HistoricalSentimentLogModel } from '@/database/models/historical_sentiment_log.model';

export interface SystemOperationalStatus {
    timestamp: string;
    overallHealth: 'healthy' | 'degraded' | 'limited';
    database: {
        status: 'connected' | 'disconnected' | 'connecting';
        latencyMs: number;
    };
    marketData: {
        provider: 'Finnhub';
        quotesAvailable: boolean;
        companyNewsAvailable: boolean;
        historicalCandlesTierStatus: 'unsupported_on_free_tier' | 'available';
        circuitBreakerActive: boolean;
        cacheNotice: string;
    };
    aiIntelligence: {
        provider: 'Google Gemini';
        status: 'operational' | 'cooldown_active' | 'unconfigured';
        activeModel: string;
        cooldownRemainingSeconds: number;
        fallbackMechanism: 'deterministic_rule_based';
    };
    backgroundCollector: {
        lastRunTimestamp: string | null;
        lastRunStatus: 'idle' | 'running' | 'success' | 'partial_failure' | 'failed';
        pointInTimeRecordsPersisted: number;
        trackedSymbolsCount: number;
    };
    historicalEvaluation: {
        readinessStatus: string;
        eligibleEventsCount: number;
        hasSufficientSample: boolean;
    };
    emailDelivery: {
        status: 'configured' | 'simulation_mode';
        provider: 'Gmail SMTP';
    };
    dataProvenanceLegend: {
        live: string;
        cached: string;
        ai_generated: string;
        deterministic_fallback: string;
        historical_point_in_time: string;
        insufficient_data: string;
    };
}

export class SystemStatusService {
    /**
     * Gathers unified operational health without making paid diagnostic calls
     * or exposing credentials.
     */
    public static async getSystemStatus(): Promise<SystemOperationalStatus> {
        const timestamp = new Date().toISOString();

        // 1. Database Health Check (using existing connection pool)
        let dbStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
        let dbLatencyMs = 0;
        try {
            const start = Date.now();
            const state = mongoose.connection.readyState as number;
            if (state === 1) {
                dbStatus = 'connected';
            } else {
                await connectToDatabase();
                dbStatus = (mongoose.connection.readyState as number) === 1 ? 'connected' : 'connecting';
            }
            dbLatencyMs = Date.now() - start;
        } catch {
            dbStatus = 'disconnected';
        }

        // 2. Finnhub Market Data State
        const finnhubKeyConfigured = Boolean(
            process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY
        );
        const candleEndpointAvailable = FinnhubMarketService.isCandleEndpointAvailable();

        // 3. Gemini AI State
        const geminiKeyConfigured = Boolean(process.env.GEMINI_API_KEY);
        const activeCooldown = aiCooldownTracker.getActiveCooldownError();
        const aiStatus: 'operational' | 'cooldown_active' | 'unconfigured' = !geminiKeyConfigured
            ? 'unconfigured'
            : activeCooldown
            ? 'cooldown_active'
            : 'operational';

        // 4. Collector & Historical Evaluation Readiness
        let pointInTimeCount = 0;
        let trackedSymbolsCount = 0;
        let evaluationReadiness = 'NO_HISTORICAL_RECORDS';

        try {
            if (dbStatus === 'connected') {
                pointInTimeCount = await HistoricalSentimentLogModel.countDocuments({
                    version: 1,
                    provenance: 'point_in_time_recorded',
                });
                const symbols = await HistoricalSentimentLogModel.distinct('symbol');
                trackedSymbolsCount = symbols.length;

                if (pointInTimeCount === 0) {
                    evaluationReadiness = 'NO_HISTORICAL_RECORDS';
                } else if (pointInTimeCount < 30) {
                    evaluationReadiness = 'INSUFFICIENT_OBSERVATIONS';
                } else {
                    evaluationReadiness = 'EVALUATION_COMPLETED_UNCERTAIN';
                }
            }
        } catch {
            // DB fallback
        }

        const collectorStatus = NewsSentimentCollectorService.getPipelineStatus();

        // 5. Email Service Configuration
        const smtpConfigured = Boolean(
            (process.env.SMTP_USER && process.env.SMTP_PASSWORD) ||
            (process.env.NODEMAILER_EMAIL && process.env.NODEMAILER_PASSWORD) ||
            (process.env.EMAIL_USER && process.env.EMAIL_PASS)
        );

        // 6. Overall Health Determination
        let overallHealth: 'healthy' | 'degraded' | 'limited' = 'healthy';
        if (dbStatus === 'disconnected' || !finnhubKeyConfigured) {
            overallHealth = 'degraded';
        } else if (activeCooldown || !candleEndpointAvailable) {
            overallHealth = 'limited';
        }

        return {
            timestamp,
            overallHealth,
            database: {
                status: dbStatus,
                latencyMs: dbLatencyMs,
            },
            marketData: {
                provider: 'Finnhub',
                quotesAvailable: finnhubKeyConfigured,
                companyNewsAvailable: finnhubKeyConfigured,
                historicalCandlesTierStatus: candleEndpointAvailable
                    ? 'available'
                    : 'unsupported_on_free_tier',
                circuitBreakerActive: !candleEndpointAvailable,
                cacheNotice: 'REST responses cached in-memory and HTTP force-cache according to MARKET_CONFIG TTL.',
            },
            aiIntelligence: {
                provider: 'Google Gemini',
                status: aiStatus,
                activeModel: AI_CONFIG.defaultModel,
                cooldownRemainingSeconds: activeCooldown?.retryAfterSeconds || 0,
                fallbackMechanism: 'deterministic_rule_based',
            },
            backgroundCollector: {
                lastRunTimestamp: collectorStatus.lastRunSummary?.completedAt || null,
                lastRunStatus: collectorStatus.isRunning
                    ? 'running'
                    : collectorStatus.lastRunSummary
                    ? 'success'
                    : 'idle',
                pointInTimeRecordsPersisted: pointInTimeCount,
                trackedSymbolsCount,
            },
            historicalEvaluation: {
                readinessStatus: evaluationReadiness,
                eligibleEventsCount: pointInTimeCount,
                hasSufficientSample: pointInTimeCount >= 30,
            },
            emailDelivery: {
                status: smtpConfigured ? 'configured' : 'simulation_mode',
                provider: 'Gmail SMTP',
            },
            dataProvenanceLegend: {
                live: 'Direct fresh feed from provider',
                cached: 'Recently fetched within cache TTL',
                ai_generated: 'Synthesized via Google Gemini',
                deterministic_fallback: 'Rule-based heuristic extraction when AI is in cooldown or offline',
                historical_point_in_time: 'Immutable point-in-time assessment recorded at publication',
                insufficient_data: 'Sample size below statistical evaluation threshold',
            },
        };
    }
}
