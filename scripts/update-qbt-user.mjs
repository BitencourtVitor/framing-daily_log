import mongoose from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  console.error("❌  MONGODB_URL not set. Run with: node --env-file=.env.local scripts/update-qbt-user.mjs");
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  })
);

const name = args.name;
const qbtUserId = args["qbt-user-id"] ? Number(args["qbt-user-id"]) : null;

if (!name || !qbtUserId) {
  console.error("Usage:");
  console.error("  npm run update:qbt-user -- --name=\"Vitor Bitencourt\" --qbt-user-id=12345678");
  process.exit(1);
}

const SupervisorSchema = new mongoose.Schema({
  name: String,
  pin: String,
  active: Boolean,
  qbtUserId: Number,
}, { timestamps: true });

const Supervisor = mongoose.models.Supervisor ?? mongoose.model("Supervisor", SupervisorSchema);

await mongoose.connect(MONGODB_URL, { bufferCommands: false });

const result = await Supervisor.findOneAndUpdate(
  { name: new RegExp(name, "i") },
  { qbtUserId },
  { new: true }
);

if (!result) {
  console.error(`❌  No supervisor found matching name "${name}"`);
  process.exit(1);
}

console.log("✅  Updated:");
console.log(`    Name       : ${result.name}`);
console.log(`    QBT UserID : ${result.qbtUserId}`);

await mongoose.disconnect();
