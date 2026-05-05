import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  if (!pin || typeof pin !== "string" || pin.length !== 6) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
  }

  await connectDB();

  const users = await User.find({ active: true });
  let matched = null;

  for (const u of users) {
    const ok = await bcrypt.compare(pin, u.pin);
    if (ok) {
      matched = u;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  await createSession({ userId: matched._id, name: matched.name, role: matched.role });

  return NextResponse.json({ name: matched.name, role: matched.role });
}
