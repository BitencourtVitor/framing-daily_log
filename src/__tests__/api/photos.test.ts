import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { TEST_SUPERVISOR_ID } from "../setup";
import { supervisorSession } from "../helpers/session";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/storage", () => ({
  uploadPhoto: vi.fn().mockResolvedValue(undefined),
  getPhotoBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-image-data")),
  deletePhoto: vi.fn().mockResolvedValue(undefined),
  photoToDataUrl: vi.fn().mockReturnValue("data:image/jpeg;base64,fake"),
}));

import { GET, POST } from "@/app/api/daily-log/[id]/photos/route";
import { GET as getPhoto } from "@/app/api/photo/route";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { DailyLog } from "@/models/DailyLog";
import { Photo } from "@/models/Photo";

const mockGetSession = vi.mocked(getSession);

let logId: string;
let photoStorageKey: string;

beforeAll(async () => {
  await connectDB();
  await DailyLog.deleteOne({ supervisorId: TEST_SUPERVISOR_ID, date: "2099-02-01" });
  const log = await DailyLog.create({
    supervisorId: TEST_SUPERVISOR_ID,
    supervisorName: "Test Supervisor",
    date: "2099-02-01",
    workers: [],
    activities: [],
    notes: { machineEntries: [], machinesNA: true, materials: "", materialsNA: true, problems: "", problemsNA: true, nextDayPlan: "", nextDayPlanNA: true, supervisorNotes: "", supervisorNotesNA: true },
    status: "draft",
  });
  logId = log._id.toString();
});

afterAll(async () => {
  await Photo.deleteMany({ logId });
  await DailyLog.deleteOne({ _id: logId });
});

beforeEach(() => {
  mockGetSession.mockReset();
});

// ── GET /api/daily-log/[id]/photos ────────────────────────────────────────────

describe("GET /api/daily-log/[id]/photos", () => {
  it("401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await GET(getReq(), ctx(logId));
    expect(res.status).toBe(401);
  });

  it("200 returns empty array initially", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await GET(getReq(), ctx(logId));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

// ── POST /api/daily-log/[id]/photos ───────────────────────────────────────────

describe("POST /api/daily-log/[id]/photos", () => {
  it("401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.append("file", new Blob(["x"], { type: "image/jpeg" }), "test.jpg");
    const res = await POST(formReq(fd), ctx(logId));
    expect(res.status).toBe(401);
  });

  it("400 when no file provided", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await POST(formReq(new FormData()), ctx(logId));
    expect(res.status).toBe(400);
  });

  it("201 uploads general photo", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const fd = new FormData();
    fd.append("file", new Blob(["fake-image"], { type: "image/jpeg" }), "photo.jpg");
    const res = await POST(formReq(fd), ctx(logId));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key).toBeDefined();
    photoStorageKey = body.key;
  });

  it("201 uploads activity-specific photo", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const fd = new FormData();
    fd.append("file", new Blob(["fake-image"], { type: "image/jpeg" }), "activity.jpg");
    fd.append("activityIndex", "0");
    const res = await POST(formReq(fd), ctx(logId));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key).toContain("activity-0");
  });

  it("GET returns uploaded photos", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await GET(getReq(), ctx(logId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
    // Verify one is general and one is activity-specific
    const general = body.filter((p: { activityIndex: number | null }) => p.activityIndex === null || p.activityIndex === undefined);
    const activity = body.filter((p: { activityIndex: number | null }) => p.activityIndex !== null && p.activityIndex !== undefined);
    expect(general.length).toBeGreaterThanOrEqual(1);
    expect(activity.length).toBeGreaterThanOrEqual(1);
  });

  it("404 when log does not belong to user", async () => {
    mockGetSession.mockResolvedValueOnce({ userId: "other-user", name: "Other", role: "supervisor" });
    const fd = new FormData();
    fd.append("file", new Blob(["x"], { type: "image/jpeg" }), "x.jpg");
    const res = await POST(formReq(fd), ctx(logId));
    expect(res.status).toBe(404);
  });
});

// ── GET /api/photo ────────────────────────────────────────────────────────────

describe("GET /api/photo", () => {
  it("401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await getPhoto(new NextRequest("http://localhost/api/photo?key=somekey") as never);
    expect(res.status).toBe(401);
  });

  it("400 when key param is missing", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await getPhoto(new NextRequest("http://localhost/api/photo") as never);
    expect(res.status).toBe(400);
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getReq() {
  return new Request("http://localhost/api/test") as never;
}

function formReq(fd: FormData) {
  return new Request("http://localhost/api/test", { method: "POST", body: fd }) as never;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
