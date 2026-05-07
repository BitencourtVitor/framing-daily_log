import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { TEST_VEHICLE_PREFIX } from "../setup";
import { supervisorSession, adminSession } from "../helpers/session";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

import { GET, POST } from "@/app/api/admin/vehicles/route";
import { PATCH } from "@/app/api/admin/vehicles/[id]/route";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Vehicle } from "@/models/Vehicle";

const mockGetSession = vi.mocked(getSession);

const PLATE_A = `${TEST_VEHICLE_PREFIX}AAA`;
const PLATE_B = `${TEST_VEHICLE_PREFIX}BBB`;
let vehicleId: string;

beforeAll(async () => {
  await connectDB();
  await Vehicle.deleteMany({ plate: { $in: [PLATE_A, PLATE_B] } });
});

afterAll(async () => {
  await Vehicle.deleteMany({ plate: { $regex: new RegExp(`^${TEST_VEHICLE_PREFIX}`) } });
});

beforeEach(() => {
  mockGetSession.mockReset();
});

// ── GET /api/admin/vehicles ───────────────────────────────────────────────────

describe("GET /api/admin/vehicles", () => {
  it("403 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("200 returns vehicles list", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

// ── POST /api/admin/vehicles ──────────────────────────────────────────────────

describe("POST /api/admin/vehicles", () => {
  it("403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await POST(jsonReq({ plate: PLATE_A }));
    expect(res.status).toBe(403);
  });

  it("400 when plate is missing", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(400);
  });

  it("201 creates vehicle", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await POST(jsonReq({ plate: PLATE_A, description: "Test Truck" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.plate).toBe(PLATE_A);
    expect(body.description).toBe("Test Truck");
    vehicleId = body._id;
  });

  it("409 when plate already exists", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await POST(jsonReq({ plate: PLATE_A }));
    expect(res.status).toBe(409);
  });
});

// ── PATCH /api/admin/vehicles/[id] ───────────────────────────────────────────

describe("PATCH /api/admin/vehicles/[id]", () => {
  it("403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await PATCH(jsonReq({ description: "x" }), ctx(vehicleId));
    expect(res.status).toBe(403);
  });

  it("200 updates description", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await PATCH(jsonReq({ description: "Updated Truck" }), ctx(vehicleId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toBe("Updated Truck");
  });

  it("200 deactivates vehicle", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await PATCH(jsonReq({ active: false }), ctx(vehicleId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.active).toBe(false);
  });

  it("404 for non-existent vehicle", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await PATCH(jsonReq({ plate: PLATE_B }), ctx("507f1f77bcf86cd799439011"));
    expect(res.status).toBe(404);
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
