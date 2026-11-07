import mongoose, { Schema, Document } from "mongoose";

export type DeliveryStatus = "PENDING" | "DELIVERED" | "SKIPPED" | "FAILED";

export interface IDelivery extends Document {
  customer: mongoose.Types.ObjectId;
  subscription: mongoose.Types.ObjectId;
  deliveryDate: Date;
  dateString: string; // YYYY-MM-DD
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

// Compound unique index prevents duplicate deliveries for the same customer on the same date
deliverySchema.index({ customer: 1, dateString: 1 }, { unique: true });
deliverySchema.index({ dateString: 1, status: 1 });

const Delivery = mongoose.model<IDelivery>("Delivery", deliverySchema);

export default Delivery;
