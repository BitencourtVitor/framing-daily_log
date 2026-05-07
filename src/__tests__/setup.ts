import dotenv from "dotenv";
import { resolve } from "path";
import { afterAll } from "vitest";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

export const TEST_SUPERVISOR_ID = "vitest-supervisor-id";
export const TEST_ADMIN_ID = "vitest-admin-id";
export const TEST_EMAIL_PREFIX = "vitest-";
export const TEST_EMAIL_DOMAIN = "@premiumframing.test";
export const TEST_VEHICLE_PREFIX = "VITEST-";

afterAll(async () => {
  const { connectDB } = await import("@/lib/mongodb");
  const { DailyLog } = await import("@/models/DailyLog");
  const { User } = await import("@/models/User");
  const { Vehicle } = await import("@/models/Vehicle");
  const { Photo } = await import("@/models/Photo");

  await connectDB();

  const testLogs = await DailyLog.find({
    supervisorId: { $in: [TEST_SUPERVISOR_ID, TEST_ADMIN_ID] },
  }).select("_id");
  const logIds = testLogs.map((l) => l._id);

  await Photo.deleteMany({ logId: { $in: logIds } });
  await DailyLog.deleteMany({
    supervisorId: { $in: [TEST_SUPERVISOR_ID, TEST_ADMIN_ID] },
  });
  await User.deleteMany({ email: { $regex: new RegExp(`^${TEST_EMAIL_PREFIX}`) } });
  await Vehicle.deleteMany({ plate: { $regex: new RegExp(`^${TEST_VEHICLE_PREFIX}`) } });
});
