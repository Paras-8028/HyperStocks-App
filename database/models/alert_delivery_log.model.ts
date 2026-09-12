import { Schema, model, models, Document } from 'mongoose';
import { SmartAlertCategory } from '@/types/alerts';

export interface IAlertDeliveryLogDocument extends Document {
    userId: string;
    alertKey: string;
    alertCategory: SmartAlertCategory;
    symbol?: string;
    sentAt: Date;
    cooldownUntil: Date;
    deliveryStatus: 'sent' | 'failed';
    messageId?: string;
    error?: string;
    createdAt: Date;
}

const AlertDeliveryLogSchema = new Schema<IAlertDeliveryLogDocument>(
    {
        userId: { type: String, required: true, index: true },
        alertKey: { type: String, required: true, index: true },
        alertCategory: { type: String, required: true },
        symbol: { type: String, uppercase: true },
        sentAt: { type: Date, default: Date.now },
        cooldownUntil: { type: Date, required: true, index: true },
        deliveryStatus: {
            type: String,
            enum: ['sent', 'failed'],
            required: true,
        },
        messageId: String,
        error: String,
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for instant deduplication lookup
AlertDeliveryLogSchema.index({ userId: 1, alertKey: 1 });

export const AlertDeliveryLogModel =
    models.AlertDeliveryLog ||
    model<IAlertDeliveryLogDocument>('AlertDeliveryLog', AlertDeliveryLogSchema);
