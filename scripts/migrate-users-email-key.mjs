/**
 * One-time migration: drop users collection (old _id: Number)
 * and re-insert with email as _id, preserving existing PIN hashes.
 *
 * Run: bun --env-file=.env.local scripts/migrate-users-email-key.mjs
 */
import mongoose from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) {
  console.error("❌  MONGODB_URL not set");
  process.exit(1);
}

await mongoose.connect(MONGODB_URL, { bufferCommands: false });
const col = mongoose.connection.db.collection("users");

const existing = await col.find({}).toArray();
console.log(`Found ${existing.length} existing user(s):`);
existing.forEach((u) => console.log(`  _id=${u._id}  name=${u.name}  email=${u.email ?? "(none)"}`));

if (existing.length === 0) {
  console.log("Nothing to migrate.");
  await mongoose.disconnect();
  process.exit(0);
}

// Build new docs: use email as _id, preserve hashed pin
const newDocs = existing.map((u) => {
  const email = u.email || u._id; // fallback to _id if no email field (already migrated)
  if (!email || !email.includes("@")) {
    console.error(`❌  User ${u._id} (${u.name}) has invalid email — cannot migrate.`);
    process.exit(1);
  }
  return {
    _id:       email,
    name:      u.name,
    pin:       u.pin,
    role:      u.role,
    companies: u.companies ?? [],
    qbtIds:    u.qbtIds ?? {},
    active:    u.active ?? true,
    createdAt: u.createdAt ?? new Date(),
    updatedAt: new Date(),
  };
});

// For Vitor: ensure all 3 QBT IDs are present
const vitor = newDocs.find((d) => d.email === "vitor@premiumgrpinc.com");
if (vitor) {
  vitor.qbtIds = { framing: 6947156, hvac: 7349326, pcg: 7041580 };
  vitor.companies = ["framing", "hvac", "pcg"];
  console.log("  → Patching Vitor with all 3 QBT IDs");
}

await col.drop().catch(() => {});
console.log("✅  users collection dropped");

await col.insertMany(newDocs);
console.log(`✅  Re-inserted ${newDocs.length} user(s) with email as _id:`);
newDocs.forEach((d) => console.log(`    ${d._id}  role=${d.role}  companies=[${d.companies.join(",")}]`));

await mongoose.disconnect();
