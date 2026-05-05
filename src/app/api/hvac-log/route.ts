import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { HVACLog } from "@/models/HVACLog";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, places, locations, stage, teamMembers, performedService,
          observations, materialControl, vehicle, licensePlates, driver, warrantyService } = body;

  if (!date) return NextResponse.json({ error: "Date required" }, { status: 400 });

  await connectDB();

  const existing = await HVACLog.findOne({ supervisorId: session.userId, date });
  if (existing) return NextResponse.json({ error: "Log already exists for this date" }, { status: 409 });

  const log = await HVACLog.create({
    supervisorId: session.userId,
    supervisorName: session.name,
    date,
    places: places ?? 1,
    locations: locations ?? "",
    stage: stage ?? "",
    teamMembers: teamMembers ?? [],
    performedService: performedService ?? "",
    observations: observations ?? "",
    materialControl: materialControl ?? "",
    vehicle: vehicle ?? false,
    licensePlates: licensePlates ?? [],
    driver: driver ?? "",
    warrantyService: warrantyService ?? false,
    status: "draft",
  });

  return NextResponse.json({ id: log._id.toString() }, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const logs = await HVACLog.find({ supervisorId: session.userId })
    .sort({ date: -1 })
    .limit(30)
    .select("-__v");

  return NextResponse.json(logs);
}
