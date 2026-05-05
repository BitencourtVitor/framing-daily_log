import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) {
  console.error("❌  MONGODB_URL not set. Run with: bun --env-file=.env.local scripts/seed-user.mjs");
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  })
);

const { name, pin, role } = args;
const qbtId = args["qbt-id"] ? Number(args["qbt-id"]) : null;

if (!name || !pin || !role || !qbtId) {
  console.error("Usage:");
  console.error('  bun run seed:user -- --name="John Doe" --pin=123456 --role=supervisor --qbt-id=1234567');
  console.error("Roles: admin | dev | supervisor");
  process.exit(1);
}

if (!/^\d{6}$/.test(pin)) {
  console.error("❌  PIN must be exactly 6 digits.");
  process.exit(1);
}

if (!["admin", "dev", "supervisor"].includes(role)) {
  console.error("❌  Role must be: admin | dev | supervisor");
  process.exit(1);
}

if (isNaN(qbtId)) {
  console.error("❌  qbt-id must be a number.");
  process.exit(1);
}

await mongoose.connect(MONGODB_URL, { bufferCommands: false });

const hashed = await bcrypt.hash(pin, 12);
const col = mongoose.connection.collection("users");

const existing = await col.findOne({ _id: qbtId });
if (existing) {
  console.error(`❌  User with QBT ID ${qbtId} already exists: ${existing.name}`);
  await mongoose.disconnect();
  process.exit(1);
}

await col.insertOne({
  _id: qbtId,
  name,
  pin: hashed,
  role,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log("✅  User created:");
console.log(`    Name   : ${name}`);
console.log(`    QBT ID : ${qbtId}`);
console.log(`    Role   : ${role}`);

await mongoose.disconnect();
