import { Schema, model, models, type Document, type Model } from "mongoose";

export interface Alert extends Document {
    userId: string;
    symbol: string;
    condition: "above" | "below";
    targetPrice: number;
    triggered: boolean;
    createdAt: Date;
}

const AlertSchema = new Schema<Alert>(
    {
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true },
        condition: { type: String, enum: ["above", "below"], required: true },
        targetPrice: { type: Number, required: true },
        triggered: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

AlertSchema.index({ userId: 1, symbol: 1, triggered: 1 });

export const AlertModel: Model<Alert> =
    models.Alert || model<Alert>("Alert", AlertSchema);
