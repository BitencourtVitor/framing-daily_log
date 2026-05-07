import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { DailyLog } from "@/models/DailyLog";
import { getPhotoBuffer } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return new NextResponse(null, { status: 400 });

  await connectDB();

  const photo = await Photo.findOne({ storageKey: key }).lean();
  if (!photo) return new NextResponse(null, { status: 404 });

  const isAdmin = session.role === "admin" || session.role === "dev";
  if (!isAdmin) {
    const log = await DailyLog.findById(photo.logId).lean();
    if (!log || log.supervisorId !== session.userId) {
      return new NextResponse(null, { status: 403 });
    }
  }

  const buffer = await getPhotoBuffer(key);
  if (!buffer) return new NextResponse(null, { status: 404 });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": photo.mimetype,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
