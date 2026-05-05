import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";
import { Photo } from "@/models/Photo";
import { uploadPhoto } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectDB();

  const log = await DailyLog.findOne({ _id: id, supervisorId: session.supervisorId });
  if (!log) return NextResponse.json({ error: "Log not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `logs/${id}/${randomUUID()}.${ext}`;

  await uploadPhoto(key, buffer, file.type);

  await Photo.create({
    logId: log._id,
    filename: file.name,
    mimetype: file.type,
    storageKey: key,
    uploadedToBT: false,
  });

  return NextResponse.json({ key }, { status: 201 });
}
