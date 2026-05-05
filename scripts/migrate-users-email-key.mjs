/**
 * Migration: drop users collection and re-insert with ObjectId _id.
 * Email becomes a regular unique indexed field (not _id).
 *
 * Run: bun --env-file=.env.local scripts/migrate-users-email-key.mjs
 */
import mongoose from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) { console.error("❌  MONGODB_URL not set"); process.exit(1); }

await mongoose.connect(MONGODB_URL, { bufferCommands: false });
const col = mongoose.connection.db.collection("users");

const existing = await col.find({}).toArray();
console.log(`Found ${existing.length} existing user(s):`);
existing.forEach((u) => console.log(`  _id=${u._id}  name=${u.name}  email=${u.email ?? "(none)"}`));

// Build new docs: fresh ObjectId _id, email as field
const newDocs = existing.map((u) => {
  const email = u.email || (typeof u._id === "string" && u._id.includes("@") ? u._id : null);
  if (!email) {
    console.error(`❌  User ${u._id} (${u.name}) has no email. Abort.`);
    process.exit(1);
  }
  return {
    _id:       new mongoose.Types.ObjectId(),
    name:      u.name,
    email:     email.toLowerCase(),
    pin:       u.pin,
    role:      u.role,
    companies: u.companies ?? [],
    qbtIds:    u.qbtIds ?? {},
    active:    u.active ?? true,
    createdAt: u.createdAt ?? new Date(),
    updatedAt: new Date(),
  };
});

// Patch Vitor's qbtIds
const vitor = newDocs.find((d) => d.email === "vitor@premiumgrpinc.com");
if (vitor) {
  vitor.qbtIds = { framing: 6947156, hvac: 7349326, pcg: 7041580 };
  vitor.companies = ["framing", "hvac", "pcg"];
}

await col.drop().catch(() => {});
console.log("✅  users collection dropped");

await col.insertMany(newDocs);
console.log(`✅  Re-inserted ${newDocs.length} user(s):`);
newDocs.forEach((d) =>
  console.log(`    _id=${d._id}  email=${d.email}  role=${d.role}  companies=[${d.companies.join(",")}]`)
);

// Create email unique index
await col.createIndex({ email: 1 }, { unique: true });
console.log("✅  Unique index on email created");

await mongoose.disconnect();
