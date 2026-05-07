import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { TEST_EMAIL_PREFIX, TEST_EMAIL_DOMAIN } from "../setup";
import { supervisorSession, adminSession } from "../helpers/session";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

import { GET, POST } from "@/app/api/admin/users/route";
import { PATCH } from "@/app/api/admin/users/[id]/route";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

const mockGetSession = vi.mocked(getSession);

const EMAIL_NEW  = `${TEST_EMAIL_PREFIX}users-new${TEST_EMAIL_DOMAIN}`;
const EMAIL_PATCH = `${TEST_EMAIL_PREFIX}users-patch${TEST_EMAIL_DOMAIN}`;

let patchUserId: string;

beforeAll(async () => {
  await connectDB();
  await User.deleteMany({ email: { $in: [EMAIL_NEW, EMAIL_PATCH] } });

  // Create a dedicated user for PATCH tests (not via API so no ordering dependency)
  const hashed = await bcrypt.hash("654321", 12);
  const user = await User.create({
    name: "Vitest Patch User",
    email: EMAIL_PATCH,
    pin: hashed,
    role: "supervisor",
    companies: ["framing"],
    active: true,
  });
  patchUserId = user._id.toString();
});

afterAll(async () => {
  await User.deleteMany({ email: { $in: [EMAIL_NEW, EMAIL_PATCH] } });
});

beforeEach(() => {
  mockGetSession.mockReset();
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────

describe("GET /api/admin/users", () => {
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

  it("200 returns user list for admin (without pin)", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    body.forEach((u: Record<string, unknown>) => expect(u.pin).toBeUndefined());
  });
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────

describe("POST /api/admin/users", () => {
  it("403 when not admin", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await POST(jsonReq({ name: "X", email: EMAIL_NEW, role: "supervisor", pin: "111111" }));
    expect(res.status).toBe(403);
  });

  it("400 on missing required fields", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await POST(jsonReq({ name: "X" }));
    expect(res.status).toBe(400);
  });

  it("400 on invalid PIN format", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await POST(jsonReq({ name: "X", email: EMAIL_NEW, role: "supervisor", pin: "abc" }));
    expect(res.status).toBe(400);
  });

  it("201 creates new user", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await POST(jsonReq({ name: "Vitest New User", email: EMAIL_NEW, role: "supervisor", pin: "654321" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Vitest New User");
    expect(body.pin).toBeUndefined();
  });

  it("409 when email already exists", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await POST(jsonReq({ name: "Dup", email: EMAIL_NEW, role: "supervisor", pin: "654321" }));
    expect(res.status).toBe(409);
  });
});

// ── PATCH /api/admin/users/[id] ───────────────────────────────────────────────

describe("PATCH /api/admin/users/[id]", () => {
  it("403 when not admin", async () => {
    mockGetSession.mockResolvedValueOnce(supervisorSession);
    const res = await PATCH(jsonReq({ name: "New Name" }), ctx(patchUserId));
    expect(res.status).toBe(403);
  });

  it("200 updates user name", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await PATCH(jsonReq({ name: "Updated Name" }), ctx(patchUserId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Name");
  });

  it("400 on invalid PIN in update", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await PATCH(jsonReq({ pin: "abc" }), ctx(patchUserId));
    expect(res.status).toBe(400);
  });

  it("200 updates PIN successfully", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await PATCH(jsonReq({ pin: "999888" }), ctx(patchUserId));
    expect(res.status).toBe(200);
  });

  it("200 deactivates user", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await PATCH(jsonReq({ active: false }), ctx(patchUserId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.active).toBe(false);
  });

  it("404 for non-existent user", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const res = await PATCH(jsonReq({ name: "X" }), ctx("507f1f77bcf86cd799439011"));
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
