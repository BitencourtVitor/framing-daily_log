import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getJobcodes } from "@/lib/quickbooks-time";
import type { CompanyId } from "@/models/User";

// In-memory cache: key = "company:parentId" → { data, expiresAt }
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const VALID_COMPANIES: CompanyId[] = ["framing", "hvac", "pcg"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const company  = (searchParams.get("company") ?? "framing") as CompanyId;
  const parentId = parseInt(searchParams.get("parentId") ?? "0", 10);

  if (!VALID_COMPANIES.includes(company))
    return NextResponse.json({ error: "Invalid company" }, { status: 400 });

  const cacheKey = `${company}:${parentId}`;
  const cached   = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const jobcodes = await getJobcodes(parentId, company);
    const sorted   = jobcodes.sort((a, b) => a.name.localeCompare(b.name));
    cache.set(cacheKey, { data: sorted, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(sorted);
  } catch (err) {
    console.error("[qbt/jobcodes]", err);
    // Return stale cache if available
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json({ error: "Failed to fetch jobcodes from QuickBooks Time" }, { status: 502 });
  }
}
