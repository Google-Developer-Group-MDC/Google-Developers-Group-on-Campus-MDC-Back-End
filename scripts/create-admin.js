// Usage: npm run create-admin -- <email> <password> ["Full Name"]
// or set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in .env and run: npm run create-admin
// Running it again for an existing email resets that admin's password.
import { connectDB, disconnectDB } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { Admin } from "../src/models/Admin.js";

const [emailArg, passwordArg, nameArg] = process.argv.slice(2);
const email = (emailArg ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = passwordArg ?? process.env.ADMIN_PASSWORD ?? "";
const name = nameArg ?? process.env.ADMIN_NAME ?? "";

if (!email || !password) {
  console.error('Usage: npm run create-admin -- <email> <password> ["Full Name"]');
  process.exit(1);
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}
if (!env.MONGODB_URI) {
  console.error("MONGODB_URI is not set — an admin created in the in-memory database would disappear immediately.");
  console.error("Set MONGODB_URI in .env, or use the auto-created dev admin printed by `npm run dev`.");
  process.exit(1);
}

await connectDB();
const passwordHash = await Admin.hashPassword(password);
const admin = await Admin.findOneAndUpdate(
  { email },
  { $set: { passwordHash, ...(name && { name }) } },
  { upsert: true, returnDocument: "after" }
);
console.log(`✅ Admin ready: ${admin.email}`);
await disconnectDB();
