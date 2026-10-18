import { Schema, model, models, Document, Model } from 'mongoose';
import { RiskDataQuality, RiskSeverity, TriggeredRiskCondition } from '@/types/risk';

export interface IRiskSignalLogDocument extends Document {
    symbol: string;
    assessmentTimestamp: Date; // Timestamp when assessment was performed
    referencePrice: number;
    priceType: 'completed_daily_close' | 'live_intraday_quote';
    dataAsOfTimestamp: Date; // Timestamp of the latest price bar analyzed
    engineVersion: string;
    dataSource: string; // 'finnhub' | 'historical_db' | 'synthetic'
    dataQuality: RiskDataQuality;
    
    // Core Quantitative Indicators (nullable when unavailable)
    historicalVolatility21d: number | null;
    historicalVolatility63d: number | null;
    historicalVaR95: number | null;
    historicalCVaR95: number | null;
    maximumDrawdown: number | null;
    smaDistancePercent: number | null;
    lowProximityPercent: number | null;
    volatilityExpansionRatio: number | null;

    // Composite & Severity Outputs
    experimentalRiskScore: number;
    severity: RiskSeverity;
    triggeredConditions: TriggeredRiskCondition[];
    thresholdsApplied: string[];
    assessmentStatus: 'completed' | 'skipped' | 'partial' | 'error';
    summary: string;

    createdAt: Date;
    updatedAt: Date;
}

const TriggeredConditionSchema = new Schema(
    {
        category: { type: String, required: true },
        severity: { type: String, required: true },
        title: { type: String, required: true },
        measurement: { type: String, required: true },
        evidence: { type: String, required: true },
        observationWindow: { type: String, required: true },
        thresholdApplied: { type: String, required: true },
    },
    { _id: false }
);

const RiskSignalLogSchema = new Schema<IRiskSignalLogDocument>(
    {
        symbol: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        assessmentTimestamp: {
            type: Date,
            required: true,
            index: true,
        },
        referencePrice: {
            type: Number,
            required: true,
            min: [0, 'Reference price cannot be negative'],
        },
        priceType: {
            type: String,
            enum: ['completed_daily_close', 'live_intraday_quote'],
            default: 'completed_daily_close',
            required: true,
        },
        dataAsOfTimestamp: {
            type: Date,
            required: true,
        },
        engineVersion: {
            type: String,
            required: true,
            trim: true,
        },
        dataSource: {
            type: String,
            required: true,
            default: 'finnhub',
            trim: true,
        },
        dataQuality: {
            type: String,
            enum: ['sufficient', 'marginal', 'insufficient', 'unavailable'],
            required: true,
        },
        historicalVolatility21d: {
            type: Number,
            default: null,
        },
        historicalVolatility63d: {
            type: Number,
            default: null,
        },
        historicalVaR95: {
            type: Number,
            default: null,
        },
        historicalCVaR95: {
            type: Number,
            default: null,
        },
        maximumDrawdown: {
            type: Number,
            default: null,
        },
        smaDistancePercent: {
            type: Number,
            default: null,
        },
        lowProximityPercent: {
            type: Number,
            default: null,
        },
        volatilityExpansionRatio: {
            type: Number,
            default: null,
        },
        experimentalRiskScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        severity: {
            type: String,
            enum: ['low', 'advisory', 'warning', 'critical'],
            required: true,
            index: true,
        },
        triggeredConditions: {
            type: [TriggeredConditionSchema],
            default: [],
        },
        thresholdsApplied: {
            type: [String],
            default: [],
        },
        assessmentStatus: {
            type: String,
            enum: ['completed', 'skipped', 'partial', 'error'],
            default: 'completed',
            required: true,
        },
        summary: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for point-in-time signal queries and deduplication per assessment timestamp
RiskSignalLogSchema.index(
    { symbol: 1, assessmentTimestamp: 1, engineVersion: 1 },
    { unique: true }
);

// Query optimization for historical analysis and severity scanning
RiskSignalLogSchema.index({ symbol: 1, assessmentTimestamp: -1, severity: 1 });

export const RiskSignalLogModel: Model<IRiskSignalLogDocument> =
    (models.RiskSignalLog as Model<IRiskSignalLogDocument>) ||
    model<IRiskSignalLogDocument>('RiskSignalLog', RiskSignalLogSchema);
