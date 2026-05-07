import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Location } from "@/models/Location";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const parentId = searchParams.get("parentId");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (level !== null) filter.level = parseInt(level);
  if (parentId) filter.parentId = new mongoose.Types.ObjectId(parentId);
  if (!level && !parentId) filter.level = 0;

  const locations = await Location.find(filter).sort({ name: 1 }).lean();
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "dev")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, level, parentId } = await req.json();
  if (!name || level === undefined)
    return NextResponse.json({ error: "name and level required" }, { status: 400 });

  await connectDB();

  const loc = await Location.create({
    name: name.trim(),
    level,
    parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
  });

  return NextResponse.json(loc, { status: 201 });
}
