import mongoose, { Schema, Document } from "mongoose";

export interface ISupervisor extends Document {
  name: string;
  pin: string; // bcrypt hash
  active: boolean;
  qbtUserId: number | null; // QuickBooks Time user ID — add after creating QBT app
  createdAt: Date;
}

const SupervisorSchema = new Schema<ISupervisor>(
  {
    name: { type: String, required: true },
    pin: { type: String, required: true },
    active: { type: Boolean, default: true },
    qbtUserId: { type: Number, default: null },
  },
  { timestamps: true }
);

export const Supervisor =
  mongoose.models.Supervisor ||
  mongoose.model<ISupervisor>("Supervisor", SupervisorSchema);
