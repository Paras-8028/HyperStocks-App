import { Schema, model, models, Document } from 'mongoose';

export type DigestDeliveryStatus = 'pending' | 'sent' | 'failed';
export type DigestDeliveryType = 'personalized_news' | 'empty_watchlist' | 'macro_briefing' | 'test';

export interface IDigestDeliveryLogDocument extends Document {
    userId: string;
    deliveryType: DigestDeliveryType;
    idempotencyKey: string;
    symbols: string[];
    articleUrls: string[];
    deliveryStatus: DigestDeliveryStatus;
    attemptedAt: Date;
    sentAt?: Date;
    providerMessageId?: string;
    error?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const DigestDeliveryLogSchema = new Schema<IDigestDeliveryLogDocument>(
    {
        userId: { type: String, required: true, index: true },
        deliveryType: {
            type: String,
            enum: ['personalized_news', 'empty_watchlist', 'macro_briefing', 'test'],
            default: 'personalized_news',
            required: true,
        },
        idempotencyKey: { type: String, required: true },
        symbols: { type: [String], default: [] },
        articleUrls: { type: [String], default: [] },
        deliveryStatus: {
            type: String,
            enum: ['pending', 'sent', 'failed'],
            required: true,
            default: 'pending',
            index: true,
        },
        attemptedAt: { type: Date, default: Date.now },
        sentAt: { type: Date },
        providerMessageId: { type: String },
        error: { type: String },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

// Compound unique index ensuring idempotency per user and delivery window
DigestDeliveryLogSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
DigestDeliveryLogSchema.index({ userId: 1, sentAt: -1 });

export const DigestDeliveryLogModel =
    models.DigestDeliveryLog ||
    model<IDigestDeliveryLogDocument>('DigestDeliveryLog', DigestDeliveryLogSchema);
