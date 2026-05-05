import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Vehicle } from "@/models/Vehicle";

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
  if (body.plate !== undefined) update.plate = body.plate.trim();
  if (body.description !== undefined) update.description = body.description;
  if (body.active !== undefined) update.active = body.active;
  await connectDB();
  const v = await Vehicle.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(v);
}
