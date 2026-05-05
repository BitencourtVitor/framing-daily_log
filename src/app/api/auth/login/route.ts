import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { userId, pin } = await req.json();

  if (!userId || !pin || typeof pin !== "string" || pin.length !== 6) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(userId);
  if (!user || !user.active) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const ok = await bcrypt.compare(pin, user.pin);
  if (!ok) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  await createSession({ userId: user._id.toString(), name: user.name, role: user.role });

  return NextResponse.json({ name: user.name, role: user.role });
}
