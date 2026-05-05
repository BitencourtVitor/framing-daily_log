import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Subcontractor } from "@/models/Subcontractor";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const subs = await Subcontractor.find({ active: true }).sort({ company: 1 }).lean();
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, workers } = await req.json();
  if (!company?.trim())
    return NextResponse.json({ error: "Company name required" }, { status: 400 });

  await connectDB();

  const existing = await Subcontractor.findOne({ company: company.trim() });
  if (existing) {
    const merged = [...new Set([...existing.workers, ...(workers ?? [])])];
    existing.workers = merged;
    await existing.save();
    return NextResponse.json(existing);
  }

  const sub = await Subcontractor.create({
    company: company.trim(),
    workers: workers ?? [],
  });
  return NextResponse.json(sub, { status: 201 });
}
