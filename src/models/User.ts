import mongoose, { Schema } from "mongoose";

export type UserRole = "admin" | "dev" | "supervisor";
export type CompanyId = "framing" | "hvac" | "pcg";

export interface IUser {
  _id: mongoose.Types.ObjectId; // auto-generated, stable system key
  name: string;
  email: string;                // unique, cross-company identifier
  pin: string;                  // bcrypt hash
  role: UserRole;
  companies: CompanyId[];
  qbtIds: Partial<Record<CompanyId, number>>; // QBT user ID per company
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:  { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    pin:   { type: String, required: true },
    role:  { type: String, enum: ["admin", "dev", "supervisor"], required: true },
    companies: [{ type: String, enum: ["framing", "hvac", "pcg"] }],
    qbtIds: {
      framing: { type: Number },
      hvac:    { type: Number },
      pcg:     { type: Number },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
