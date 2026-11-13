import mongoose, { Schema, Document } from "mongoose";

export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "PAYMENT_PENDING" | "CANCELLED";

export interface IPauseEntry {
  pausedAt: Date;
  expectedResumeDate?: Date;
  resumedAt?: Date;
  reason?: string;
}

export interface ISubscription extends Document {
  customer: mongoose.Types.ObjectId;
  packageCatalog?: mongoose.Types.ObjectId;
  packageName?: string;
  pricePerTiffin: number;
  totalTiffins: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  totalAmount: number;
  advancePaid: number;
  mealsPerDay: number;
  mealTypes: string[];
  status: SubscriptionStatus;
  startDate: Date;
  completionDate?: Date | null;
  pauseHistory: IPauseEntry[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pauseEntrySchema = new Schema<IPauseEntry>(
  {
    pausedAt: { type: Date, required: true },
    expectedResumeDate: { type: Date, default: null },
    resumedAt: { type: Date, default: null },
    reason: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const subscriptionSchema = new Schema<ISubscription>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    packageCatalog: {
      type: Schema.Types.ObjectId,
      ref: "PackageCatalog",
      default: null,
    },
    packageName: {
      type: String,
      trim: true,
      default: "Standard Package",
    },
    pricePerTiffin: {
      type: Number,
      required: true,
      min: 1,
    },
    totalTiffins: {
      type: Number,
      required: true,
      min: 1,
    },
    deliveredQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    advancePaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    mealsPerDay: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
    mealTypes: {
      type: [String],
      default: ["LUNCH"],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "COMPLETED", "PAYMENT_PENDING", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    pauseHistory: {
      type: [pauseEntrySchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
subscriptionSchema.index({ customer: 1, status: 1 });

const Subscription = mongoose.model<ISubscription>("Subscription", subscriptionSchema);

export default Subscription;
