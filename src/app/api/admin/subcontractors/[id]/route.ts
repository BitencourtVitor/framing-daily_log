import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Subcontractor } from "@/models/Subcontractor";

async function guard() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "dev") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.company !== undefined) update.company = body.company.trim();
  if (body.workers !== undefined) update.workers = body.workers;
  if (body.active !== undefined) update.active = body.active;
  await connectDB();
  const sub = await Subcontractor.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sub);
}
