import mongoose, { Schema, Document } from "mongoose";

export interface ISubcontractor extends Document {
  company: string;
  workers: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubcontractorSchema = new Schema<ISubcontractor>(
  {
    company: { type: String, required: true, unique: true, trim: true },
    workers: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Subcontractor =
  mongoose.models.Subcontractor ||
  mongoose.model<ISubcontractor>("Subcontractor", SubcontractorSchema);
