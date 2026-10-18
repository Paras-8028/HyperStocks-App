import { Schema, model, models, Document, Model } from 'mongoose';
import { NewsConfidenceDimensions, NewsSentimentClass } from '@/types/news';

export type SentimentProvenanceType = 'point_in_time_recorded' | 'retrospective_inference';

export interface IHistoricalSentimentLogDocument extends Document {
    articleId: string;
    symbol: string;
    symbols: string[]; // All symbols associated with this article
    headline: string;
    summary?: string;
    contentUsed?: string; // Text actually analyzed by the model
    source: string;
    url?: string;
    provider: string; // e.g. 'finnhub', 'sec_edgar', etc.
    
    // Provenance timestamps
    publishedAt: Date; // Original publication timestamp from publisher
    firstSeenAt: Date; // Timestamp when our collector first ingested the article
    assessedAt: Date; // Timestamp when sentiment assessment was computed
    recordedAt: Date; // Timestamp when database record was inserted
    lastProcessedAt: Date; // Timestamp of latest update or processing run
    
    // Assessment versioning
    version: number; // Assessment version (1 = initial point-in-time, >1 = reassessments)
    analysisVersion: string; // Pipeline / prompt version, e.g. '1.0.0-phase7'
    modelProvider: string; // 'gemini' | 'deterministic_fallback'
    isRetrospective: boolean; // True if assessed retrospectively from older text
    provenance: SentimentProvenanceType; // 'point_in_time_recorded' vs 'retrospective_inference'
    
    // Cross-ticker syndication tracking
    canonicalStoryId: string; // Hash or id of original story to detect syndicated duplicates across tickers
    isSyndicatedCopy: boolean; // Flag indicating article was syndicated to multiple symbols
    
    // Sentiment classifications
    sentiment: NewsSentimentClass;
    companySentiment: NewsSentimentClass;
    marketSentiment: NewsSentimentClass;
    
    // Separated Confidence Dimensions
    sourceReliabilityScore: number;
    sourceReliabilityTier: string;
    sourceReliabilityRationale?: string;
    interpretationConfidenceScore: number;
    interpretationRationale?: string;
    marketDirectionalUncertaintyScore: number;
    directionalUncertaintyLevel: string;
    directionalUncertaintyRationale?: string;
    confidenceDimensions?: NewsConfidenceDimensions;
    
    // Impact analysis
    whatHappened?: string;
    whyItMatters?: string;
    bottomLine?: string;
    shortTermOutlook?: string;
    longTermConsiderations?: string;
    risks?: string[];
    opportunities?: string[];
    processingError?: string;
    
    createdAt: Date;
    updatedAt: Date;
}

const HistoricalSentimentLogSchema = new Schema<IHistoricalSentimentLogDocument>(
    {
        articleId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        symbol: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        symbols: {
            type: [String],
            default: [],
        },
        headline: {
            type: String,
            required: true,
            trim: true,
        },
        summary: {
            type: String,
            trim: true,
            default: '',
        },
        contentUsed: {
            type: String,
            trim: true,
            default: '',
        },
        source: {
            type: String,
            required: true,
            trim: true,
        },
        url: {
            type: String,
            trim: true,
            default: '',
        },
        provider: {
            type: String,
            default: 'finnhub',
            trim: true,
        },
        publishedAt: {
            type: Date,
            required: true,
            index: true,
        },
        firstSeenAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
        assessedAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
        recordedAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
        lastProcessedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        version: {
            type: Number,
            required: true,
            default: 1,
            min: 1,
        },
        analysisVersion: {
            type: String,
            required: true,
            default: '1.0.0-phase7',
        },
        modelProvider: {
            type: String,
            default: 'gemini',
        },
        provenance: {
            type: String,
            enum: ['point_in_time_recorded', 'retrospective_inference'],
            required: true,
            default: 'point_in_time_recorded',
            index: true,
        },
        isRetrospective: {
            type: Boolean,
            required: true,
            default: false,
        },
        canonicalStoryId: {
            type: String,
            default: '',
            index: true,
        },
        isSyndicatedCopy: {
            type: Boolean,
            default: false,
        },
        sentiment: {
            type: String,
            enum: ['bullish', 'bearish', 'neutral', 'mixed'],
            required: true,
            index: true,
        },
        companySentiment: {
            type: String,
            enum: ['bullish', 'bearish', 'neutral', 'mixed'],
            default: 'neutral',
        },
        marketSentiment: {
            type: String,
            enum: ['bullish', 'bearish', 'neutral', 'mixed'],
            default: 'neutral',
        },
        sourceReliabilityScore: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
        },
        sourceReliabilityTier: {
            type: String,
            default: 'secondary_aggregator',
        },
        sourceReliabilityRationale: {
            type: String,
            default: '',
        },
        interpretationConfidenceScore: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
        },
        interpretationRationale: {
            type: String,
            default: '',
        },
        marketDirectionalUncertaintyScore: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
        },
        directionalUncertaintyLevel: {
            type: String,
            default: 'moderate',
        },
        directionalUncertaintyRationale: {
            type: String,
            default: '',
        },
        whatHappened: {
            type: String,
            default: '',
        },
        whyItMatters: {
            type: String,
            default: '',
        },
        bottomLine: {
            type: String,
            default: '',
        },
        shortTermOutlook: {
            type: String,
            default: '',
        },
        longTermConsiderations: {
            type: String,
            default: '',
        },
        risks: {
            type: [String],
            default: [],
        },
        opportunities: {
            type: [String],
            default: [],
        },
        processingError: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index ensuring idempotency per symbol, article, and version
// Crucial: Reprocessing under a new model/prompt creates a new version instead of overwriting version 1!
HistoricalSentimentLogSchema.index(
    { symbol: 1, articleId: 1, version: 1 },
    { unique: true }
);

// Point-in-time chronological lookups for backtesting and evaluation
HistoricalSentimentLogSchema.index({ symbol: 1, assessedAt: 1, provenance: 1 });
HistoricalSentimentLogSchema.index({ symbol: 1, publishedAt: 1 });
HistoricalSentimentLogSchema.index({ canonicalStoryId: 1, publishedAt: 1 });

export const HistoricalSentimentLogModel: Model<IHistoricalSentimentLogDocument> =
    (models.HistoricalSentimentLog as Model<IHistoricalSentimentLogDocument>) ||
    model<IHistoricalSentimentLogDocument>('HistoricalSentimentLog', HistoricalSentimentLogSchema);
