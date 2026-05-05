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

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await connectDB();
  const subs = await Subcontractor.find().sort({ company: 1 }).lean();
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { company } = await req.json();
  if (!company?.trim()) return NextResponse.json({ error: "Company name required" }, { status: 400 });
  await connectDB();
  const exists = await Subcontractor.findOne({ company: company.trim() });
  if (exists) return NextResponse.json({ error: "Company already exists" }, { status: 409 });
  const sub = await Subcontractor.create({ company: company.trim(), workers: [], active: true });
  return NextResponse.json(sub, { status: 201 });
}
