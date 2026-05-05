import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { QBTUserCache } from "@/models/QBTUserCache";
import { getAllUsers } from "@/lib/quickbooks-time";
import type { CompanyId } from "@/models/User";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const VALID_COMPANIES: CompanyId[] = ["framing", "hvac", "pcg"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = (req.nextUrl.searchParams.get("company") ?? "framing") as CompanyId;
  if (!VALID_COMPANIES.includes(company))
    return NextResponse.json({ error: "Invalid company" }, { status: 400 });

  await connectDB();

  const latest = await QBTUserCache.findOne({ company }).sort({ syncedAt: -1 });
  const stale = !latest || Date.now() - latest.syncedAt.getTime() > CACHE_TTL_MS;

  if (stale) {
    const users = await getAllUsers(company);
    const now = new Date();
    for (const u of users) {
      await QBTUserCache.findOneAndUpdate(
        { qbtId: u.id, company },
        { qbtId: u.id, company, firstName: u.first_name, lastName: u.last_name, syncedAt: now },
        { upsert: true }
      );
    }
  }

  const workers = await QBTUserCache.find({ company }).sort({ firstName: 1 }).lean();
  return NextResponse.json(
    workers.map((w) => ({ id: w.qbtId, name: `${w.firstName} ${w.lastName}` }))
  );
}
