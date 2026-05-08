import mongoose, { Schema, Document } from "mongoose";

export interface IEmailConfig extends Document {
  dlRecipients: string[];
  bcRecipients: string[];
}

const EmailConfigSchema = new Schema<IEmailConfig>(
  {
    dlRecipients: [{ type: String }],
    bcRecipients: [{ type: String }],
  },
  { timestamps: true }
);

delete (mongoose.models as Record<string, unknown>).EmailConfig;
export const EmailConfig = mongoose.model<IEmailConfig>("EmailConfig", EmailConfigSchema);
