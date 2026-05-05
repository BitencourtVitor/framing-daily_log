import mongoose, { Schema, Document } from "mongoose";

export type LogStatus = "draft" | "syncing" | "synced" | "failed";
export type WorkType = "normal" | "back-charge" | "extra" | "garantia";

export interface IWorker {
  qbtUserId: number;
  name: string;
}

export interface IActivity {
  workerNames: string[];
  description: string;
  timeStart: string;
  timeEnd: string;
  workType: WorkType;
}

export interface ISubcontractorEntry {
  company: string;
  workerNames: string[];
  description: string;
}

export interface INotes {
  machines: string;
  materials: string;
  problems: string;
  nextDayPlan: string;
  supervisorNotes: string;
}

export interface IDailyLog extends Document {
  supervisorId: mongoose.Types.ObjectId;
  supervisorName: string;
  date: string;
  workers: IWorker[];
  activities: IActivity[];
  subcontractors: ISubcontractorEntry[];
  notes: INotes;
  status: LogStatus;
  btLogId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const DailyLogSchema = new Schema<IDailyLog>(
  {
    supervisorId: { type: Schema.Types.ObjectId, ref: "Supervisor", required: true },
    supervisorName: { type: String, required: true },
    date: { type: String, required: true },
    workers: [
      {
        _id: false,
        qbtUserId: { type: Number, required: true },
        name: { type: String, required: true },
      },
    ],
    activities: [
      {
        _id: false,
        workerNames: [{ type: String }],
        description: { type: String, required: true },
        timeStart: { type: String, required: true },
        timeEnd: { type: String, required: true },
        workType: {
          type: String,
          enum: ["normal", "back-charge", "extra", "garantia"],
          required: true,
        },
      },
    ],
    subcontractors: [
      {
        _id: false,
        company: { type: String, required: true },
        workerNames: [{ type: String }],
        description: { type: String, default: "" },
      },
    ],
    notes: {
      machines: { type: String, default: "" },
      materials: { type: String, default: "" },
      problems: { type: String, default: "" },
      nextDayPlan: { type: String, default: "" },
      supervisorNotes: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["draft", "syncing", "synced", "failed"],
      default: "draft",
    },
    btLogId: { type: String, default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

DailyLogSchema.index({ supervisorId: 1, date: 1 }, { unique: true });

export const DailyLog =
  mongoose.models.DailyLog ||
  mongoose.model<IDailyLog>("DailyLog", DailyLogSchema);
