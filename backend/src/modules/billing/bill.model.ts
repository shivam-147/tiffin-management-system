import mongoose, { Schema, Document } from "mongoose";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";

export interface IPaymentRecord {
  paymentId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  recordedAt: Date;
}

export interface IBill extends Document {
  billNumber: string;
  customer: mongoose.Types.ObjectId;
  billingMonth: number; // 1 - 12
  billingYear: number;
  billingPeriod: string; // YYYY-MM
  deliveredCount: number;
  pricePerTiffin: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  payments: IPaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const paymentRecordSchema = new Schema<IPaymentRecord>(
  {
    paymentId: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"],
      default: "CASH",
    },
    transactionReference: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, default: null },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const billSchema = new Schema<IBill>(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    billingMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    billingYear: {
      type: Number,
      required: true,
    },
    billingPeriod: {
      type: String,
      required: true,
      index: true, // YYYY-MM
    },
    deliveredCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    pricePerTiffin: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    pendingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID"],
      default: "UNPAID",
      index: true,
    },
    payments: {
      type: [paymentRecordSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: one bill per customer per billing period
billSchema.index({ customer: 1, billingPeriod: 1 }, { unique: true });
billSchema.index({ billingPeriod: 1, paymentStatus: 1 });

const Bill = mongoose.model<IBill>("Bill", billSchema);

export default Bill;
