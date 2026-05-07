import { NextRequest, NextResponse } from "next/server";
import busboy from "busboy";
import { Readable } from "stream";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";
import { Photo } from "@/models/Photo";
import { uploadPhoto, deletePhoto } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectDB();

  const log = await DailyLog.findOne({ _id: id, supervisorId: session.userId });
  if (!log) return NextResponse.json({ error: "Log not found" }, { status: 404 });

  // Stream the multipart body via busboy to bypass Next.js's 10 MB formData limit
  const contentType = req.headers.get("content-type") ?? "";
  const { buffer, filename, mimetype, activityIndex } = await new Promise<{
    buffer: Buffer;
    filename: string;
    mimetype: string;
    activityIndex: number | null;
  }>((resolve, reject) => {
    const bb = busboy({ headers: { "content-type": contentType } });
    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let fileFilename = "upload";
    let fileMimetype = "application/octet-stream";

    bb.on("field", (name, val) => { fields[name] = val; });

    bb.on("file", (_name, fileStream, info) => {
      fileFilename = info.filename;
      fileMimetype = info.mimeType;
      const chunks: Buffer[] = [];
      fileStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      fileStream.on("end", () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on("finish", () => {
      if (!fileBuffer) return reject(new Error("No file provided"));
      const raw = fields.activityIndex;
      resolve({
        buffer: fileBuffer,
        filename: fileFilename,
        mimetype: fileMimetype,
        activityIndex: raw !== undefined && raw !== "" ? parseInt(raw, 10) : null,
      });
    });

    bb.on("error", reject);

    Readable.fromWeb(req.body as import("stream/web").ReadableStream).pipe(bb);
  });

  const ext = filename.split(".").pop() ?? "jpg";
  const prefix = activityIndex !== null ? `activity-${activityIndex}` : "general";
  const key = `logs/${id}/${prefix}/${randomUUID()}.${ext}`;

  await uploadPhoto(key, buffer, mimetype);

  await Photo.create({
    logId: log._id,
    activityIndex,
    filename,
    mimetype,
    storageKey: key,
  });

  return NextResponse.json({ key }, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const photos = await Photo.find({ logId: id }).sort({ createdAt: 1 }).lean();
  return NextResponse.json(photos);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const photoId = new URL(req.url).searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  await connectDB();

  const log = await DailyLog.findOne({ _id: id, supervisorId: session.userId });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photo = await Photo.findOne({ _id: photoId, logId: id });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  await deletePhoto(photo.storageKey);
  await Photo.deleteOne({ _id: photoId });

  return NextResponse.json({ ok: true });
}
