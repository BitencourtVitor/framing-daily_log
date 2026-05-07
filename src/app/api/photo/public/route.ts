import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Photo, IPhoto } from "@/models/Photo";
import { getPhotoBuffer } from "@/lib/storage";
import type { FlattenMaps } from "mongoose";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return new NextResponse(null, { status: 400 });

  await connectDB();

  const photo = await Photo.findOne({ storageKey: key }).lean() as FlattenMaps<IPhoto> | null;
  if (!photo) return new NextResponse(null, { status: 404 });

  const buffer = await getPhotoBuffer(key);
  if (!buffer) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": photo.mimetype,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
