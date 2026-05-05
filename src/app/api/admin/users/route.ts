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

  const { name, email, role, pin, qbtIds, companies } = await req.json();

  if (!email || !name || !role || !pin) {
    return NextResponse.json({ error: "email, name, role and pin are required" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 6 digits" }, { status: 400 });
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return NextResponse.json({ error: "User already exists" }, { status: 409 });

  // qbtIds: { framing?: number|null, hvac?: number|null, pcg?: number|null }
  const cleanQbtIds: Partial<Record<CompanyId, number>> = {};
  for (const c of ["framing", "hvac", "pcg"] as CompanyId[]) {
    const v = (qbtIds ?? {})[c];
    if (v != null) cleanQbtIds[c] = Number(v);
  }

  // companies: derive from qbtIds keys if not provided
  const derivedCompanies: CompanyId[] =
    Array.isArray(companies) && companies.length > 0
      ? companies
      : (Object.keys(cleanQbtIds) as CompanyId[]);

  const hashed = await bcrypt.hash(pin, 12);
  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    pin: hashed,
    role: role as UserRole,
    companies: derivedCompanies,
    qbtIds: cleanQbtIds,
    active: true,
  });

  const { pin: _, ...safe } = user.toObject();
  return NextResponse.json(safe, { status: 201 });
}
