import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { QBTUserCache } from "@/models/QBTUserCache";
import { getAllUsers } from "@/lib/quickbooks-time";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const latest = await QBTUserCache.findOne().sort({ syncedAt: -1 });
  const stale =
    !latest || Date.now() - latest.syncedAt.getTime() > CACHE_TTL_MS;

  if (stale) {
    const users = await getAllUsers();
    const now = new Date();
    for (const u of users) {
      await QBTUserCache.findOneAndUpdate(
        { qbtId: u.id },
        { qbtId: u.id, firstName: u.first_name, lastName: u.last_name, syncedAt: now },
        { upsert: true }
      );
    }
  }

  const workers = await QBTUserCache.find().sort({ firstName: 1 }).lean();
  return NextResponse.json(
    workers.map((w) => ({ id: w.qbtId, name: `${w.firstName} ${w.lastName}` }))
  );
}
