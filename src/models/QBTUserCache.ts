import mongoose, { Schema, Document } from "mongoose";
import type { CompanyId } from "@/models/User";

export interface IQBTUserCache extends Document {
  qbtId: number;
  company: CompanyId;
  firstName: string;
  lastName: string;
  email: string;
  syncedAt: Date;
}

const QBTUserCacheSchema = new Schema<IQBTUserCache>({
  qbtId: { type: Number, required: true },
  company: { type: String, enum: ["framing", "hvac", "pcg"], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, default: "" },
  syncedAt: { type: Date, required: true },
});

QBTUserCacheSchema.index({ qbtId: 1, company: 1 }, { unique: true });

export const QBTUserCache =
  mongoose.models.QBTUserCache ||
  mongoose.model<IQBTUserCache>("QBTUserCache", QBTUserCacheSchema);
