import mongoose from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) { console.error("MONGODB_URL not set"); process.exit(1); }

await mongoose.connect(MONGODB_URL);
const db = mongoose.connection.db;
const col = db.collection("qbtusercaches");

try {
  await col.dropIndex("qbtId_1");
  console.log("✓ Dropped old index qbtId_1");
} catch (e) {
  console.log("Index qbtId_1 not found (already gone):", e.message);
}

// Also clear stale cache so it re-syncs all companies cleanly
await col.deleteMany({});
console.log("✓ Cleared cache — will re-sync on next request");

await mongoose.disconnect();
