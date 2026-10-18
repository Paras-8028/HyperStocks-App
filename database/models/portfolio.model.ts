import { Schema, model, models, Document } from 'mongoose';

export interface IPortfolioPositionDocument extends Document {
    userId: string;
    symbol: string;
    shares: number;
    costBasis: number;
    buyDate?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PortfolioPositionSchema = new Schema<IPortfolioPositionDocument>(
    {
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        shares: { type: Number, required: true, min: 0.0001 },
        costBasis: { type: Number, required: true, min: 0 },
        buyDate: { type: Date, default: Date.now },
        notes: { type: String, maxlength: 500 },
    },
    { timestamps: true }
);

PortfolioPositionSchema.index({ userId: 1, symbol: 1 });

export const PortfolioPositionModel =
    models.PortfolioPosition ||
    model<IPortfolioPositionDocument>('PortfolioPosition', PortfolioPositionSchema);
