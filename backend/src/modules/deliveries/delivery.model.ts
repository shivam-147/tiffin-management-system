import mongoose, { Schema, Document } from "mongoose";

export type DeliveryStatus = "PENDING" | "DELIVERED" | "SKIPPED" | "FAILED";
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "EXTRA";

export interface IDelivery extends Document {
  customer: mongoose.Types.ObjectId;
  subscription: mongoose.Types.ObjectId;
  deliveryDate: Date;
  dateString: string; // YYYY-MM-DD
  mealType: MealType;
  quantity: number;
  status: DeliveryStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySchema = new Schema<IDelivery>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    dateString: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    mealType: {
      type: String,
      enum: ["BREAKFAST", "LUNCH", "DINNER", "EXTRA"],
      default: "LUNCH",
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ["PENDING", "DELIVERED", "SKIPPED", "FAILED"],
      default: "PENDING",
      index: true,
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

// Compound unique index prevents duplicate deliveries for the same customer, date, and meal slot
deliverySchema.index({ customer: 1, dateString: 1, mealType: 1 }, { unique: true });
deliverySchema.index({ dateString: 1, status: 1 });

const Delivery = mongoose.model<IDelivery>("Delivery", deliverySchema);

export default Delivery;
