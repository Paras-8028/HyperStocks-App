import { Schema, model, models } from "mongoose";

export interface Alert {
    userId: string;
    symbol: string;
    targetPrice: number;
    condition: "above" | "below";
    status: "active" | "triggered";
    triggeredAt?: Date;
    createdAt: Date;
}

const AlertSchema = new Schema<Alert>(
    {
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true },
        targetPrice: { type: Number, required: true },
        condition: { type: String, enum: ["above", "below"], required: true },
        status: {
            type: String,
            enum: ["active", "triggered"],
            default: "active",
        },
        triggeredAt: Date,
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const AlertModel =
    models.Alert || model<Alert>("Alert", AlertSchema);
