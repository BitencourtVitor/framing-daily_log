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

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await connectDB();
  const users = await User.find().sort({ name: 1 }).select("-pin").lean();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { qbtId, name, email, role, companies, pin } = await req.json();

  if (!email || !name || !role || !pin) {
    return NextResponse.json({ error: "email, name, role and pin are required" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 6 digits" }, { status: 400 });
  }

  await connectDB();

  const existing = await User.findById(email);
  if (existing) return NextResponse.json({ error: "User already exists" }, { status: 409 });

  // determine which company this worker came from (first in the companies list)
  const primaryCompany: CompanyId | undefined = (companies ?? [])[0];
  const qbtIds: Partial<Record<CompanyId, number>> = {};
  if (primaryCompany && qbtId) qbtIds[primaryCompany] = Number(qbtId);

  const hashed = await bcrypt.hash(pin, 12);
  const user = await User.create({
    _id: email,
    name,
    pin: hashed,
    role: role as UserRole,
    companies: (companies ?? []) as CompanyId[],
    qbtIds,
    active: true,
  });

  const { pin: _, ...safe } = user.toObject();
  return NextResponse.json(safe, { status: 201 });
}
