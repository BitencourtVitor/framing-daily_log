import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { EmailConfig } from "@/models/EmailConfig";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "dev")) return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const config = await EmailConfig.findOne().lean();
  return NextResponse.json(config ?? { dlRecipients: [], bcRecipients: [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { dlRecipients, bcRecipients } = await req.json();
  await EmailConfig.findOneAndUpdate(
    {},
    { $set: { dlRecipients, bcRecipients } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
