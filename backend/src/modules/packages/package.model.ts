import mongoose, { Schema, Document } from "mongoose";

export interface IPackageCatalog extends Document {
  name: string;
  description?: string;
  totalTiffins: number;
  pricePerTiffin: number;
  totalAmount: number;
  mealsPerDay: 1 | 2 | 3;
  mealTypes: string[]; // Ex. ["LUNCH"], ["LUNCH", "DINNER"], ["BREAKFAST", "LUNCH", "DINNER"]
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const packageCatalogSchema = new Schema<IPackageCatalog>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    totalTiffins: {
      type: Number,
      required: true,
      min: 1,
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
    mealsPerDay: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
    },
    mealTypes: {
      type: [String],
      default: ["LUNCH"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

packageCatalogSchema.index({ name: 1, isActive: 1 });

const PackageCatalog = mongoose.model<IPackageCatalog>("PackageCatalog", packageCatalogSchema);

export default PackageCatalog;
