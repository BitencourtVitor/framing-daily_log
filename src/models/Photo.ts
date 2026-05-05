import mongoose, { Schema, Document } from "mongoose";

export interface IPhoto extends Document {
  logId: mongoose.Types.ObjectId;
  filename: string;
  mimetype: string;
  storageKey: string; // key in Railway Object Storage
  createdAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    logId: { type: Schema.Types.ObjectId, ref: "DailyLog", required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    storageKey: { type: String, required: true },
  },
  { timestamps: true }
);

export const Photo =
  mongoose.models.Photo ||
  mongoose.model<IPhoto>("Photo", PhotoSchema);
