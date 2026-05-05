import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

// Public endpoint — returns id, name, email, role of active users for login step 1
export async function GET() {
  await connectDB();
  const users = await User.find({ active: true })
    .sort({ name: 1 })
    .select("_id name email role")
    .lean();
  return NextResponse.json(
    users.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, role: u.role }))
  );
}
