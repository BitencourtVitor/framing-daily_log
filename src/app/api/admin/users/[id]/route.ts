import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import type { CompanyId, UserRole } from "@/models/User";

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

  if (body.role !== undefined) update.role = body.role as UserRole;
  if (body.companies !== undefined) update.companies = body.companies as CompanyId[];
  if (body.active !== undefined) update.active = body.active as boolean;
  if (body.pin !== undefined) {
    if (!/^\d{6}$/.test(body.pin)) {
      return NextResponse.json({ error: "PIN must be 6 digits" }, { status: 400 });
    }
    update.pin = await bcrypt.hash(body.pin, 12);
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(Number(id), { $set: update }, { new: true }).select("-pin");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}
