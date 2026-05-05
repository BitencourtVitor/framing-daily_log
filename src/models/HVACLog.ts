import mongoose, { Schema } from "mongoose";

export type HVACLogStatus = "draft" | "syncing" | "synced" | "failed";

export interface IHVACLog {
  _id: mongoose.Types.ObjectId;
  supervisorId: number;
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
  btLogId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const HVACLogSchema = new Schema<IHVACLog>(
  {
    supervisorId: { type: Number, ref: "User", required: true },
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
    status: { type: String, enum: ["draft", "syncing", "synced", "failed"], default: "draft" },
    btLogId: { type: String, default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

HVACLogSchema.index({ supervisorId: 1, date: 1 }, { unique: true });

export const HVACLog =
  mongoose.models.HVACLog || mongoose.model<IHVACLog>("HVACLog", HVACLogSchema);
