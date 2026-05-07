import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { TEST_SUPERVISOR_ID } from "../setup";
import { supervisorSession, adminSession } from "../helpers/session";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

import { GET } from "@/app/api/admin/logs/route";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";

const mockGetSession = vi.mocked(getSession);

beforeAll(async () => {
  await connectDB();
  // Ensure at least one test log exists
  await DailyLog.findOneAndUpdate(
    { supervisorId: TEST_SUPERVISOR_ID, date: "2099-01-20" },
    {
      supervisorId: TEST_SUPERVISOR_ID,
      supervisorName: "Test Supervisor",
      date: "2099-01-20",
      workers: [],
      activities: [{ description: "Admin Log Test", timeStart: "08:00", timeEnd: "16:00", workType: "normal", workerNames: [] }],
      notes: { machineEntries: [], machinesNA: true, materials: "", materialsNA: true, problems: "", problemsNA: true, nextDayPlan: "", nextDayPlanNA: true, supervisorNotes: "", supervisorNotesNA: true },
      status: "draft",
    },
    { upsert: true }
  );
});

beforeEach(() => {
  mockGetSession.mockReset();
});

// ── GET /api/admin/logs ───────────────────────────────────────────────────────

describe("GET /api/admin/logs", () => {
  it("403 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("403 for non-admin role", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("200 returns log list with aggregated fields", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const found = body.find((l: { supervisorId: string }) => l.supervisorId === TEST_SUPERVISOR_ID);
    expect(found).toBeDefined();
    expect(typeof found.activityCount).toBe("number");
    expect(typeof found.workerCount).toBe("number");
    expect(typeof found.photoCount).toBe("number");
    expect(found.date).toBeDefined();
    expect(found.supervisorName).toBeDefined();
  });
});
