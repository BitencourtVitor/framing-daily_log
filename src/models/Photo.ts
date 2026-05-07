import mongoose, { Schema, Document } from "mongoose";

export interface IPhoto extends Document {
  logId: mongoose.Types.ObjectId;
  activityIndex?: number; // undefined/null = general photo
  filename: string;
  mimetype: string;
  storageKey: string;
  createdAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    logId: { type: Schema.Types.ObjectId, ref: "DailyLog", required: true },
    activityIndex: { type: Number, default: null },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    storageKey: { type: String, required: true },
  },
  { timestamps: true }
);

PhotoSchema.index({ logId: 1, activityIndex: 1 });

export const Photo =
  mongoose.models.Photo ||
  mongoose.model<IPhoto>("Photo", PhotoSchema);
