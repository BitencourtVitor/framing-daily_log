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

const { name, email, pin, role } = args;
const qbtFraming  = args["qbt-framing"]  ? Number(args["qbt-framing"])  : undefined;
const qbtHvac     = args["qbt-hvac"]     ? Number(args["qbt-hvac"])     : undefined;
const qbtPcg      = args["qbt-pcg"]      ? Number(args["qbt-pcg"])      : undefined;

if (!name || !email || !pin || !role) {
  console.error("Usage:");
  console.error('  bun run seed:user -- --name="John Doe" --email=john@example.com --pin=123456 --role=supervisor');
  console.error('  Optional: --qbt-framing=1234567 --qbt-hvac=7654321 --qbt-pcg=9999999');
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

await mongoose.connect(MONGODB_URL, { bufferCommands: false });

const hashed = await bcrypt.hash(pin, 12);
const col = mongoose.connection.collection("users");

const existing = await col.findOne({ _id: email });
if (existing) {
  console.error(`❌  User with email ${email} already exists: ${existing.name}`);
  await mongoose.disconnect();
  process.exit(1);
}

const qbtIds = {};
if (qbtFraming) qbtIds.framing = qbtFraming;
if (qbtHvac)    qbtIds.hvac    = qbtHvac;
if (qbtPcg)     qbtIds.pcg     = qbtPcg;

const companies = Object.keys(qbtIds);

await col.insertOne({
  _id: email,
  name,
  pin: hashed,
  role,
  companies,
  qbtIds,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log("✅  User created:");
console.log(`    Name      : ${name}`);
console.log(`    Email     : ${email}`);
console.log(`    Role      : ${role}`);
console.log(`    Companies : ${companies.join(", ") || "(none)"}`);
if (qbtFraming) console.log(`    QBT Framing: ${qbtFraming}`);
if (qbtHvac)    console.log(`    QBT HVAC   : ${qbtHvac}`);
if (qbtPcg)     console.log(`    QBT PCG    : ${qbtPcg}`);

await mongoose.disconnect();
