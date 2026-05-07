import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";
import { Photo } from "@/models/Photo";
import mongoose from "mongoose";

async function guard() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "dev") return null;
  return session;
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();

  const logs = await DailyLog.find()
    .sort({ date: -1 })
    .limit(100)
    .select("supervisorId supervisorName date status activities workers locationPath createdAt")
    .lean();

  const logIds = logs.map((l) => l._id as mongoose.Types.ObjectId);

  const photoCounts = await Photo.aggregate([
    { $match: { logId: { $in: logIds } } },
    { $group: { _id: "$logId", count: { $sum: 1 } } },
  ]);

  const photoMap = Object.fromEntries(
    photoCounts.map((p) => [p._id.toString(), p.count as number])
  );

  const result = logs.map((l) => ({
    _id: l._id,
    date: l.date,
    supervisorId: l.supervisorId,
    supervisorName: l.supervisorName,
    status: l.status,
    activityCount: l.activities.length,
    workerCount: l.workers.length,
    photoCount: photoMap[(l._id as mongoose.Types.ObjectId).toString()] ?? 0,
    createdAt: l.createdAt,
  }));

  return NextResponse.json(result);
}
