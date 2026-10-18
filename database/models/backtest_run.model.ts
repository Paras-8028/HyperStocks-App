import { Schema, model, models, Document, Model } from 'mongoose';

export interface IBacktestRunDocument extends Document {
    runId: string;
    engineVersion: string;
    status: 'completed' | 'failed' | 'partial';
    startTime: Date;
    endTime: Date;
    symbolsRequested: string[];
    symbolsEvaluated: string[];
    dateRange: {
        from: string;
        to: string;
    };
    targetDefinitions: {
        primary: {
            horizonDays: number;
            thresholdPercent: number;
            targetType: string;
            description: string;
        };
        secondary?: {
            horizonDays: number;
            thresholdPercent: number;
            targetType: string;
            description: string;
        };
    };
    signalSeverityThreshold: string;
    minHistoryWarmupDays: number;
    totalBarsLoaded: number;
    observationsSummary: {
        total: number;
        eligible: number;
        excludedIncompleteHorizon: number;
        excludedInsufficientHistory: number;
    };
    primaryConfusionMatrix: {
        truePositives: number;
        falsePositives: number;
        trueNegatives: number;
        falseNegatives: number;
    };
    primaryMetrics: {
        precision: number | null;
        recall: number | null;
        specificity: number | null;
        falsePositiveRate: number | null;
        eventBaseRate: number | null;
        f1Score: number | null;
        alertsPerSymbolPerYear: number | null;
        medianLeadTimeDays: number | null;
    };
    secondaryMetrics?: {
        precision: number | null;
        recall: number | null;
        specificity: number | null;
        falsePositiveRate: number | null;
        eventBaseRate: number | null;
        f1Score: number | null;
    };
    baselines: {
        unconditional?: any;
        sma200Breakdown?: any;
        marketIndex?: any;
    };
    perSymbolSummaries: Record<string, any>;
    dataQualityWarnings: string[];
    statisticalLimitations: string[];
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const BacktestRunSchema = new Schema<IBacktestRunDocument>(
    {
        runId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        engineVersion: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['completed', 'failed', 'partial'],
            required: true,
            index: true,
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
        symbolsRequested: {
            type: [String],
            required: true,
        },
        symbolsEvaluated: {
            type: [String],
            required: true,
        },
        dateRange: {
            from: { type: String, required: true },
            to: { type: String, required: true },
        },
        targetDefinitions: {
            primary: {
                horizonDays: { type: Number, required: true },
                thresholdPercent: { type: Number, required: true },
                targetType: { type: String, required: true },
                description: { type: String, required: true },
            },
            secondary: {
                horizonDays: { type: Number },
                thresholdPercent: { type: Number },
                targetType: { type: String },
                description: { type: String },
            },
        },
        signalSeverityThreshold: {
            type: String,
            required: true,
        },
        minHistoryWarmupDays: {
            type: Number,
            required: true,
        },
        totalBarsLoaded: {
            type: Number,
            required: true,
            default: 0,
        },
        observationsSummary: {
            total: { type: Number, required: true },
            eligible: { type: Number, required: true },
            excludedIncompleteHorizon: { type: Number, required: true },
            excludedInsufficientHistory: { type: Number, required: true },
        },
        primaryConfusionMatrix: {
            truePositives: { type: Number, required: true },
            falsePositives: { type: Number, required: true },
            trueNegatives: { type: Number, required: true },
            falseNegatives: { type: Number, required: true },
        },
        primaryMetrics: {
            precision: { type: Number, default: null },
            recall: { type: Number, default: null },
            specificity: { type: Number, default: null },
            falsePositiveRate: { type: Number, default: null },
            eventBaseRate: { type: Number, default: null },
            f1Score: { type: Number, default: null },
            alertsPerSymbolPerYear: { type: Number, default: null },
            medianLeadTimeDays: { type: Number, default: null },
        },
        secondaryMetrics: {
            precision: { type: Number, default: null },
            recall: { type: Number, default: null },
            specificity: { type: Number, default: null },
            falsePositiveRate: { type: Number, default: null },
            eventBaseRate: { type: Number, default: null },
            f1Score: { type: Number, default: null },
        },
        baselines: {
            type: Schema.Types.Mixed,
            default: {},
        },
        perSymbolSummaries: {
            type: Schema.Types.Mixed,
            default: {},
        },
        dataQualityWarnings: {
            type: [String],
            default: [],
        },
        statisticalLimitations: {
            type: [String],
            default: [],
        },
        errorMessage: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const BacktestRunModel: Model<IBacktestRunDocument> =
    (models.BacktestRun as Model<IBacktestRunDocument>) ||
    model<IBacktestRunDocument>('BacktestRun', BacktestRunSchema);
