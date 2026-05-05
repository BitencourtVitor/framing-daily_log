import mongoose, { Schema, Document } from "mongoose";

export interface IQBTUserCache extends Document {
  qbtId: number;
  firstName: string;
  lastName: string;
  syncedAt: Date;
}

const QBTUserCacheSchema = new Schema<IQBTUserCache>({
  qbtId: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  syncedAt: { type: Date, required: true },
});

export const QBTUserCache =
  mongoose.models.QBTUserCache ||
  mongoose.model<IQBTUserCache>("QBTUserCache", QBTUserCacheSchema);
