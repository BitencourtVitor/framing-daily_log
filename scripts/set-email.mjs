import mongoose from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) { console.error("MONGODB_URL not set"); process.exit(1); }

await mongoose.connect(MONGODB_URL);
const result = await mongoose.connection.db.collection("users").updateOne(
  { _id: 6947156 },
  { $set: { email: "vitor@premiumgrpinc.com" } }
);
console.log("Updated:", result.modifiedCount);
await mongoose.disconnect();
