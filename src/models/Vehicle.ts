import mongoose, { Schema } from "mongoose";

export interface IVehicle {
  _id: mongoose.Types.ObjectId;
  plate: string;
  description: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    plate: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Vehicle =
  mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", VehicleSchema);
