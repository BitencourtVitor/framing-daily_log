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

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await connectDB();
  const vehicles = await Vehicle.find().sort({ plate: 1 }).lean();
  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { plate, description } = await req.json();
  if (!plate?.trim()) return NextResponse.json({ error: "Plate required" }, { status: 400 });
  await connectDB();
  const exists = await Vehicle.findOne({ plate: plate.trim() });
  if (exists) return NextResponse.json({ error: "Plate already exists" }, { status: 409 });
  const v = await Vehicle.create({ plate: plate.trim(), description: description ?? "" });
  return NextResponse.json(v, { status: 201 });
}
