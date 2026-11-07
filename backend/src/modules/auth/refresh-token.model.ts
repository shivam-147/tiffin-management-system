import mongoose, { Schema, Document } from "mongoose";

export interface IRefreshToken extends Document {
  admin: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  replacedByTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    admin: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const RefreshToken = mongoose.model<IRefreshToken>("RefreshToken", refreshTokenSchema);

export default RefreshToken;
