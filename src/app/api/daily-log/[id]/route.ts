import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const log = await DailyLog.findById(id).lean();
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.role === "admin" || session.role === "dev";
  if (!isAdmin && log.supervisorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(log);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const log = await DailyLog.findById(id);
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.role === "admin" || session.role === "dev";
  if (!isAdmin && log.supervisorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { locationId, locationPath, workers, activities, subcontractors, notes } = await req.json();

  const $set: Record<string, unknown> = {};
  if (locationId      !== undefined) $set.locationId      = locationId ?? null;
  if (locationPath    !== undefined) $set.locationPath    = locationPath;
  if (workers         !== undefined) $set.workers         = workers;
  if (activities      !== undefined) $set.activities      = activities;
  if (subcontractors  !== undefined) $set.subcontractors  = subcontractors;
  if (notes           !== undefined) $set.notes           = notes;

  if (isAdmin) {
    const before = {
      locationPath: log.locationPath,
      workers:      log.workers,
      activities:   log.activities,
      subcontractors: log.subcontractors,
      notes:        log.notes,
    };
    const after = {
      locationPath:   locationPath    ?? log.locationPath,
      workers:        workers         ?? log.workers,
      activities:     activities      ?? log.activities,
      subcontractors: subcontractors  ?? log.subcontractors,
      notes:          notes           ?? log.notes,
    };

    await DailyLog.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set,
        $push: {
          editHistory: {
            editedById:   session.userId,
            editedByName: session.name,
            editedAt:     new Date(),
            before,
            after,
          },
        },
      } as Record<string, unknown>
    );
  } else {
    await DailyLog.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set }
    );
  }

  return NextResponse.json({ ok: true });
}
