import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  await connectDB();

  const query: Record<string, unknown> = { supervisorId: session.supervisorId };
  if (from || to) {
    const dateFilter: Record<string, string> = {};
    if (from) dateFilter.$gte = from;
    if (to) dateFilter.$lte = to;
    query.date = dateFilter;
  }

  const logs = await DailyLog.find(query, { date: 1, status: 1 }).lean();
  return NextResponse.json(logs.map((l) => ({ date: l.date, status: l.status })));
}
