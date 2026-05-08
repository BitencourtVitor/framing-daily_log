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

  const log = await DailyLog.findById(id).lean();
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.role === "admin" || session.role === "dev";
  if (!isAdmin && log.supervisorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { locationId, locationPath, workers, activities, subcontractors, notes } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (locationId      !== undefined) updateData.locationId      = locationId ?? null;
  if (locationPath    !== undefined) updateData.locationPath    = locationPath;
  if (workers         !== undefined) updateData.workers         = workers;
  if (activities      !== undefined) updateData.activities      = activities;
  if (subcontractors  !== undefined) updateData.subcontractors  = subcontractors;
  if (notes           !== undefined) updateData.notes           = notes;

  if (isAdmin) {
    const before = {
      locationPath:   log.locationPath,
      workers:        log.workers,
      activities:     log.activities,
      subcontractors: log.subcontractors,
      notes:          log.notes,
    };
    const after = {
      locationPath:   locationPath    ?? log.locationPath,
      workers:        workers         ?? log.workers,
      activities:     activities      ?? log.activities,
      subcontractors: subcontractors  ?? log.subcontractors,
      notes:          notes           ?? log.notes,
    };
    const auditEntry = {
      editedById:   session.userId,
      editedByName: session.name,
      editedAt:     new Date(),
      before,
      after,
    };

    await DailyLog.findByIdAndUpdate(
      id,
      { $set: updateData, $push: { editHistory: auditEntry } },
      { strict: false }
    );
  } else {
    const result = await DailyLog.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: false }
    );
    if (!result) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
