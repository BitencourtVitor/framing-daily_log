import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";
import { sendDailyLogEmail, sendBackChargeEmail } from "@/lib/email";

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

  // Fire emails async — don't block the response
  const emailData = {
    supervisorName: session.name,
    date,
    locationPath: locationPath ?? [],
    activities: (activities ?? []).map((a: {
      workType: string; description: string; timeStart: string;
      timeEnd: string; workerNames: string[]; chargeableSub?: string;
    }) => ({
      workType:     a.workType,
      description:  a.description,
      timeStart:    a.timeStart,
      timeEnd:      a.timeEnd,
      workerNames:  a.workerNames ?? [],
      chargeableSub: a.chargeableSub,
    })),
  };

  sendDailyLogEmail(emailData).catch((e) => console.error("[email:DL]", e));

  const hasBackCharge = (activities ?? []).some(
    (a: { workType: string }) => a.workType === "back-charge"
  );
  if (hasBackCharge) {
    sendBackChargeEmail(emailData).catch((e) => console.error("[email:BC]", e));
  }

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
