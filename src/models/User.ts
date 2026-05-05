import mongoose, { Schema } from "mongoose";

export type UserRole = "admin" | "dev" | "supervisor";
export type CompanyId = "framing" | "hvac" | "pcg";

export interface IUser {
  _id: number; // QuickBooks Time user ID
  name: string;
  pin: string; // bcrypt hash
  role: UserRole;
  companies: CompanyId[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: Number, required: true },
    name: { type: String, required: true },
    pin: { type: String, required: true },
    role: { type: String, enum: ["admin", "dev", "supervisor"], required: true },
    companies: [{ type: String, enum: ["framing", "hvac", "pcg"] }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
