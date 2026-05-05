import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTimesheetsForDate, getUsers, formatDuration } from "@/lib/quickbooks-time";
import type { CompanyId } from "@/models/User";

const VALID_COMPANIES: CompanyId[] = ["framing", "hvac", "pcg"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const company = (searchParams.get("company") ?? "framing") as CompanyId;

  if (!VALID_COMPANIES.includes(company))
    return NextResponse.json({ error: "Invalid company" }, { status: 400 });

  try {
    const timesheets = await getTimesheetsForDate(date, company);
    const userIds = [...new Set(timesheets.map((t) => t.user_id))];
    const users = userIds.length > 0 ? await getUsers(userIds, company) : [];

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const result = timesheets.map((t) => {
      const user = userMap[t.user_id];
      return {
        id: t.id,
        employee: user ? `${user.first_name} ${user.last_name}` : `User #${t.user_id}`,
        duration: formatDuration(t.duration),
        durationSeconds: t.duration,
        notes: t.notes,
        date: t.date,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
