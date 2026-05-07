import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { TEST_EMAIL_PREFIX, TEST_EMAIL_DOMAIN } from "../setup";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
  createSession: vi.fn().mockResolvedValue(undefined),
  deleteSession: vi.fn().mockResolvedValue(undefined),
}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as getUsers } from "@/app/api/auth/users/route";
import { GET as getMe } from "@/app/api/me/route";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

const mockGetSession = vi.mocked(getSession);
const TEST_PIN = "123456";
const TEST_EMAIL = `${TEST_EMAIL_PREFIX}auth${TEST_EMAIL_DOMAIN}`;
let testUserId: string;

afterAll(async () => {
  await User.deleteOne({ email: TEST_EMAIL });
});

beforeAll(async () => {
  await connectDB();
  const hashed = await bcrypt.hash(TEST_PIN, 12);
  await User.deleteOne({ email: TEST_EMAIL });
  const user = await User.create({
    name: "Vitest Auth User",
    email: TEST_EMAIL,
    pin: hashed,
    role: "supervisor",
    companies: ["framing"],
    active: true,
  });
  testUserId = user._id.toString();
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("400 on missing body fields", async () => {
    const res = await login(req("POST", {}));
    expect(res.status).toBe(400);
  });

  it("400 on PIN shorter than 6 digits", async () => {
    const res = await login(req("POST", { userId: testUserId, pin: "123" }));
    expect(res.status).toBe(400);
  });

  it("401 on wrong PIN", async () => {
    const res = await login(req("POST", { userId: testUserId, pin: "999999" }));
    expect(res.status).toBe(401);
  });

  it("401 on non-existent user", async () => {
    const res = await login(req("POST", { userId: "507f1f77bcf86cd799439011", pin: TEST_PIN }));
    expect(res.status).toBe(401);
  });

  it("200 on correct credentials", async () => {
    const res = await login(req("POST", { userId: testUserId, pin: TEST_PIN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Vitest Auth User");
    expect(body.role).toBe("supervisor");
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  it("200 always (no-op mock)", async () => {
    const res = await logout(req("POST", {}));
    expect(res.status).toBe(200);
  });
});

// ── Auth users list ───────────────────────────────────────────────────────────

describe("GET /api/auth/users (public)", () => {
  it("200 returns array with id, name, email, role", async () => {
    const res = await getUsers();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const found = body.find((u: { email: string }) => u.email === TEST_EMAIL);
    expect(found).toBeDefined();
    expect(found.id).toBeDefined();
    expect(found.name).toBeDefined();
    expect(found.role).toBeDefined();
  });
});

// ── Me ────────────────────────────────────────────────────────────────────────

describe("GET /api/me", () => {
  it("401 when not authenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await getMe();
    expect(res.status).toBe(401);
  });

  it("200 returns session info when authenticated", async () => {
    mockGetSession.mockResolvedValueOnce({ userId: testUserId, name: "Vitest Auth User", role: "supervisor" });
    const res = await getMe();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Vitest Auth User");
    expect(body.role).toBe("supervisor");
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function req(method: string, body: unknown) {
  return new Request(`http://localhost/api/test`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}
