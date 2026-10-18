import { Schema, model, models, Document } from 'mongoose';
import { AlertNotificationPreferences, DEFAULT_ALERT_PREFERENCES } from '@/types/alerts';

export interface IAlertPreferenceDocument extends Document {
    userId: string;
    readAlertIds: string[];
    dismissedAlertIds: string[];
    preferences: AlertNotificationPreferences;
    updatedAt: Date;
}

const AlertPreferenceSchema = new Schema<IAlertPreferenceDocument>(
    {
        userId: { type: String, required: true, unique: true, index: true },
        readAlertIds: { type: [String], default: [] },
        dismissedAlertIds: { type: [String], default: [] },
        preferences: {
            type: Schema.Types.Mixed,
            default: DEFAULT_ALERT_PREFERENCES,
        },
    },
    { timestamps: true }
);

export const AlertPreferenceModel =
    models.AlertPreference ||
    model<IAlertPreferenceDocument>('AlertPreference', AlertPreferenceSchema);
