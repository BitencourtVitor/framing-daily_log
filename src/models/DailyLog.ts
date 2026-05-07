import mongoose, { Schema, Document } from "mongoose";

export type LogStatus = "draft" | "submitted";
export type WorkType = "normal" | "back-charge" | "extra" | "warranty";

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
  chargeableSub?: string;
}

export interface ISubcontractorEntry {
  company: string;
  workerNames: string[];
  description: string;
}

export interface IMachineEntry {
  title: string;
  unit: string;
}

export interface INotes {
  machineEntries: IMachineEntry[];
  machinesNA: boolean;
  materials: string;
  materialsNA: boolean;
  problems: string;
  problemsNA: boolean;
  nextDayPlan: string;
  nextDayPlanNA: boolean;
  supervisorNotes: string;
  supervisorNotesNA: boolean;
}

export interface IDailyLog extends Document {
  supervisorId: string;
  supervisorName: string;
  date: string;
  locationId?: string; // QBT jobcode ID (stringified number)
  locationPath?: string[]; // snapshot: ["Customer", "Client", "Jobsite", "Lot"]
  workers: IWorker[];
  activities: IActivity[];
  subcontractors: ISubcontractorEntry[];
  notes: INotes;
  status: LogStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DailyLogSchema = new Schema<IDailyLog>(
  {
    supervisorId: { type: String, ref: "User", required: true },
    supervisorName: { type: String, required: true },
    date: { type: String, required: true },
    locationId: { type: String, default: null },
    locationPath: [{ type: String }],
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
          enum: ["normal", "back-charge", "extra", "warranty"],
          required: true,
        },
        chargeableSub: { type: String, default: "" },
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
      machineEntries: [
        {
          _id: false,
          title: { type: String, default: "" },
          unit: { type: String, default: "" },
        },
      ],
      machinesNA: { type: Boolean, default: false },
      materials: { type: String, default: "" },
      materialsNA: { type: Boolean, default: false },
      problems: { type: String, default: "" },
      problemsNA: { type: Boolean, default: false },
      nextDayPlan: { type: String, default: "" },
      nextDayPlanNA: { type: Boolean, default: false },
      supervisorNotes: { type: String, default: "" },
      supervisorNotesNA: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ["draft", "submitted"],
      default: "draft",
    },
  },
  { timestamps: true }
);

DailyLogSchema.index({ supervisorId: 1, date: 1 }, { unique: true });

// Force-reregister so schema changes take effect without a full server restart.
delete (mongoose.models as Record<string, unknown>).DailyLog;
export const DailyLog = mongoose.model<IDailyLog>("DailyLog", DailyLogSchema);
