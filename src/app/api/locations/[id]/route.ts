import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Location } from "@/models/Location";

async function guard(req: NextRequest) {
  void req;
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "dev") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await guard(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  await connectDB();
  const loc = await Location.findByIdAndUpdate(id, { name: name.trim() }, { new: true });
  if (!loc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(loc);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await guard(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  await connectDB();

  const hasChildren = await Location.exists({ parentId: id });
  if (hasChildren)
    return NextResponse.json({ error: "Cannot delete: has children" }, { status: 409 });

  await Location.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
