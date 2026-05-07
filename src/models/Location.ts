import mongoose, { Schema, Document } from "mongoose";

export type LocationLevel = 0 | 1 | 2 | 3;
// 0 = Customer, 1 = Client, 2 = Jobsite, 3 = Lot/Building

export const LEVEL_LABELS: Record<LocationLevel, string> = {
  0: "Customer",
  1: "Client",
  2: "Jobsite",
  3: "Lot / Building",
};

export interface ILocation extends Document {
  name: string;
  level: LocationLevel;
  parentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true, trim: true },
    level: { type: Number, enum: [0, 1, 2, 3], required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Location", default: null },
  },
  { timestamps: true }
);

LocationSchema.index({ level: 1, parentId: 1 });

export const Location =
  mongoose.models.Location ||
  mongoose.model<ILocation>("Location", LocationSchema);
