import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  console.error("❌  MONGODB_URL not set. Run with: node --env-file=.env.local scripts/seed-supervisor.mjs");
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  })
);

const name = args.name;
const pin = args.pin;
const qbtUserId = args["qbt-user-id"] ? Number(args["qbt-user-id"]) : null;

if (!name || !pin) {
  console.error("Usage:");
  console.error("  npm run seed:supervisor -- --name=\"Vitor Bitencourt\" --pin=130620");
  console.error("  npm run seed:supervisor -- --name=\"Vitor Bitencourt\" --pin=130620 --qbt-user-id=12345678");
  process.exit(1);
}

if (!/^\d{6}$/.test(pin)) {
  console.error("❌  PIN must be exactly 6 digits.");
  process.exit(1);
}

if (args["qbt-user-id"] && isNaN(qbtUserId)) {
  console.error("❌  qbt-user-id must be a number.");
  process.exit(1);
}

const SupervisorSchema = new mongoose.Schema({
  name: String,
  pin: String,
  active: { type: Boolean, default: true },
  qbtUserId: { type: Number, default: null },
}, { timestamps: true });

const Supervisor = mongoose.models.Supervisor ?? mongoose.model("Supervisor", SupervisorSchema);

await mongoose.connect(MONGODB_URL, { bufferCommands: false });

const hashed = await bcrypt.hash(pin, 12);
const supervisor = await Supervisor.create({ name, pin: hashed, qbtUserId });

console.log("✅  Supervisor created:");
console.log(`    Name       : ${supervisor.name}`);
console.log(`    ID         : ${supervisor._id}`);
console.log(`    PIN        : [hidden]`);
console.log(`    QBT UserID : ${supervisor.qbtUserId ?? "not set — add later with update script"}`);

await mongoose.disconnect();
