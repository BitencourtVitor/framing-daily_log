import mongoose, { Schema } from "mongoose";

export type HVACLogStatus = "draft" | "submitted";

export interface IHVACLog {
  _id: mongoose.Types.ObjectId;
  supervisorId: string; // User ObjectId
  supervisorName: string;
  date: string;
  places: number;
  locations: string;
  stage: string;
  teamMembers: string[];
  performedService: string;
  observations: string;
  materialControl: string;
  vehicle: boolean;
  licensePlates: string[];
  driver: string;
  warrantyService: boolean;
  status: HVACLogStatus;
  createdAt: Date;
  updatedAt: Date;
}

const HVACLogSchema = new Schema<IHVACLog>(
  {
    supervisorId: { type: String, ref: "User", required: true },
    supervisorName: { type: String, required: true },
    date: { type: String, required: true },
    places: { type: Number, default: 1 },
    locations: { type: String, default: "" },
    stage: { type: String, default: "" },
    teamMembers: [{ type: String }],
    performedService: { type: String, default: "" },
    observations: { type: String, default: "" },
    materialControl: { type: String, default: "" },
    vehicle: { type: Boolean, default: false },
    licensePlates: [{ type: String }],
    driver: { type: String, default: "" },
    warrantyService: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "submitted"], default: "draft" },
  },
  { timestamps: true }
);

HVACLogSchema.index({ supervisorId: 1, date: 1 }, { unique: true });

export const HVACLog =
  mongoose.models.HVACLog || mongoose.model<IHVACLog>("HVACLog", HVACLogSchema);
