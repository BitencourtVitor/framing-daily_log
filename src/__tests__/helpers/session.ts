import type { SessionPayload } from "@/lib/auth";
import { TEST_SUPERVISOR_ID, TEST_ADMIN_ID } from "../setup";

export const supervisorSession: SessionPayload = {
  userId: TEST_SUPERVISOR_ID,
  name: "Test Supervisor",
  role: "supervisor",
};

export const adminSession: SessionPayload = {
  userId: TEST_ADMIN_ID,
  name: "Test Admin",
  role: "admin",
};
