import mongoose, { Schema, Document } from "mongoose";

export interface IPhoto extends Document {
  logId: mongoose.Types.ObjectId;
  filename: string;
  mimetype: string;
  storageKey: string;      // key no Railway Object Storage
  btAttachmentId: string | null;
  uploadedToBT: boolean;
  createdAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    logId: { type: Schema.Types.ObjectId, ref: "DailyLog", required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    storageKey: { type: String, required: true },
    btAttachmentId: { type: String, default: null },
    uploadedToBT: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Photo =
  mongoose.models.Photo ||
  mongoose.model<IPhoto>("Photo", PhotoSchema);
