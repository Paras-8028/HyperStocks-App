import { Schema, model, models, Document, Model } from 'mongoose';

export interface IHistoricalBarDocument extends Document {
    symbol: string;
    timestamp: Date; // Normalized UTC timestamp of the market session
    open: number;
    high: number;
    low: number;
    close: number;
    adjustedClose?: number | null;
    volume: number;
    resolution: string; // 'D', 'W', etc.
    source: string; // 'finnhub', 'synthetic', etc.
    currency?: string;
    isSplitAdjusted: boolean;
    isDividendAdjusted: boolean;
    dataVersion?: string;
    ingestedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const HistoricalBarSchema = new Schema<IHistoricalBarDocument>(
    {
        symbol: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        timestamp: {
            type: Date,
            required: true,
            index: true,
        },
        open: {
            type: Number,
            required: true,
            min: [0.0001, 'Open price must be positive'],
        },
        high: {
            type: Number,
            required: true,
            min: [0.0001, 'High price must be positive'],
        },
        low: {
            type: Number,
            required: true,
            min: [0.0001, 'Low price must be positive'],
        },
        close: {
            type: Number,
            required: true,
            min: [0.0001, 'Close price must be positive'],
        },
        adjustedClose: {
            type: Number,
            default: null,
        },
        volume: {
            type: Number,
            required: true,
            min: [0, 'Volume must be non-negative'],
        },
        resolution: {
            type: String,
            required: true,
            default: 'D',
            trim: true,
        },
        source: {
            type: String,
            required: true,
            default: 'finnhub',
            trim: true,
        },
        currency: {
            type: String,
            default: 'USD',
            uppercase: true,
            trim: true,
        },
        isSplitAdjusted: {
            type: Boolean,
            default: true,
        },
        isDividendAdjusted: {
            type: Boolean,
            default: false,
        },
        dataVersion: {
            type: String,
            default: '1.0',
        },
        ingestedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// OHLC consistency validation prior to save
HistoricalBarSchema.pre('validate', function () {
    const doc = this as unknown as IHistoricalBarDocument;
    if (doc.high < doc.low) {
        throw new Error(`Invalid bar: High (${doc.high}) cannot be less than Low (${doc.low}) for ${doc.symbol}`);
    }
    if (doc.open > doc.high || doc.open < doc.low) {
        throw new Error(
            `Invalid bar: Open (${doc.open}) must be within [Low: ${doc.low}, High: ${doc.high}] for ${doc.symbol}`
        );
    }
    if (doc.close > doc.high || doc.close < doc.low) {
        throw new Error(
            `Invalid bar: Close (${doc.close}) must be within [Low: ${doc.low}, High: ${doc.high}] for ${doc.symbol}`
        );
    }
});

// Compound unique index ensuring idempotency (no duplicate bar for same symbol, date, resolution, source)
HistoricalBarSchema.index(
    { symbol: 1, timestamp: 1, resolution: 1, source: 1 },
    { unique: true }
);

// Range query optimization for backtesting scans
HistoricalBarSchema.index({ symbol: 1, timestamp: -1 });

export const HistoricalBarModel: Model<IHistoricalBarDocument> =
    (models.HistoricalBar as Model<IHistoricalBarDocument>) ||
    model<IHistoricalBarDocument>('HistoricalBar', HistoricalBarSchema);
