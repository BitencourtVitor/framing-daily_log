import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { Supervisor } from "@/models/Supervisor";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  if (!pin || typeof pin !== "string" || pin.length !== 6) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
  }

  await connectDB();

  const supervisors = await Supervisor.find({ active: true });
  let matched = null;

  for (const s of supervisors) {
    const ok = await bcrypt.compare(pin, s.pin);
    if (ok) {
      matched = s;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  await createSession({ supervisorId: matched._id.toString(), name: matched.name });

  return NextResponse.json({ name: matched.name });
}
