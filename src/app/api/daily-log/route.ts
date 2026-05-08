import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, locationId, locationPath, workers, activities, subcontractors, notes } = body;

  if (!date) return NextResponse.json({ error: "Date required" }, { status: 400 });

  await connectDB();

  const existing = await DailyLog.findOne({ supervisorId: session.userId, date });
  if (existing)
    return NextResponse.json({ error: "Log already exists for this date" }, { status: 409 });

  const log = await DailyLog.create({
    supervisorId: session.userId,
    supervisorName: session.name,
    date,
    locationId:   locationId ?? null,
    locationPath: locationPath ?? [],
    workers: workers ?? [],
    activities: activities ?? [],
    subcontractors: subcontractors ?? [],
    notes: notes ?? {},
    status: "submitted",
  });

  return NextResponse.json({ id: log._id.toString() }, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();

    const logs = await DailyLog.find({ supervisorId: session.userId })
      .sort({ date: -1 })
      .limit(30)
      .select("-__v");

    return NextResponse.json(logs);
  } catch (err) {
    console.error("[daily-log GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
