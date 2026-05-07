import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { TEST_SUPERVISOR_ID, TEST_ADMIN_ID } from "../setup";
import { supervisorSession, adminSession } from "../helpers/session";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

import { GET, POST } from "@/app/api/daily-log/route";
import { GET as getById } from "@/app/api/daily-log/[id]/route";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";

const mockGetSession = vi.mocked(getSession);

const TODAY = "2099-01-15";
const YESTERDAY = "2099-01-14";
let logId: string;

beforeAll(async () => {
  await connectDB();
  // Pre-create a log to test retrieval
  await DailyLog.deleteOne({ supervisorId: TEST_SUPERVISOR_ID, date: YESTERDAY });
  const log = await DailyLog.create({
    supervisorId: TEST_SUPERVISOR_ID,
    supervisorName: "Test Supervisor",
    date: YESTERDAY,
    workers: [{ qbtUserId: 99999001, name: "Worker A" }],
    activities: [{ description: "Framing", timeStart: "08:00", timeEnd: "12:00", workType: "normal", workerNames: ["Worker A"] }],
    notes: { materials: "Lumber", materialsNA: false, problems: "", problemsNA: true, nextDayPlan: "", nextDayPlanNA: true, supervisorNotes: "", supervisorNotesNA: true, machineEntries: [], machinesNA: true },
    status: "draft",
  });
  logId = log._id.toString();
});

afterAll(async () => {
  await DailyLog.deleteMany({ supervisorId: TEST_SUPERVISOR_ID, date: { $in: [TODAY, YESTERDAY] } });
});

beforeEach(() => {
  mockGetSession.mockReset();
});

// ── GET /api/daily-log ────────────────────────────────────────────────────────

describe("GET /api/daily-log", () => {
  it("401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("200 returns array of own logs", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const found = body.find((l: { date: string }) => l.date === YESTERDAY);
    expect(found).toBeDefined();
  });
});

// ── POST /api/daily-log ───────────────────────────────────────────────────────

describe("POST /api/daily-log", () => {
  it("401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await POST(jsonReq({ date: TODAY }));
    expect(res.status).toBe(401);
  });

  it("400 when date is missing", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(400);
  });

  it("201 creates a new log", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await POST(jsonReq({ date: TODAY, workers: [], activities: [] }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });

  it("409 when log already exists for that date", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await POST(jsonReq({ date: TODAY }));
    expect(res.status).toBe(409);
  });
});

// ── GET /api/daily-log/[id] ───────────────────────────────────────────────────

describe("GET /api/daily-log/[id]", () => {
  it("401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await getById(jsonReq(), ctx(logId));
    expect(res.status).toBe(401);
  });

  it("200 owner can view their own log", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await getById(jsonReq(), ctx(logId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.date).toBe(YESTERDAY);
    expect(body.supervisorName).toBe("Test Supervisor");
  });

  it("403 non-owner cannot view another user's log", async () => {
    mockGetSession.mockResolvedValueOnce({ userId: "other-user", name: "Other", role: "supervisor" });
    const res = await getById(jsonReq(), ctx(logId));
    expect(res.status).toBe(403);
  });

  it("200 admin can view any log", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await getById(jsonReq(), ctx(logId));
    expect(res.status).toBe(200);
  });

  it("404 for non-existent log", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await getById(jsonReq(), ctx("507f1f77bcf86cd799439011"));
    expect(res.status).toBe(404);
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonReq(body?: unknown) {
  return new Request("http://localhost/api/test", {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as never;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
