import crypto from "node:crypto";
import { connectDB, disconnectDB, isInMemoryDB } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { startEventSyncJob } from "./jobs/syncEvents.js";
import { Admin } from "./models/Admin.js";

await connectDB();

// The in-memory dev database starts empty, so create a throwaway admin to log in with.
if (isInMemoryDB()) {
  const email = process.env.ADMIN_EMAIL || "admin@gdg-mdc.local";
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
  await Admin.create({ email, name: "Dev Admin", passwordHash: await Admin.hashPassword(password) });
  console.log(`🔑 Dev admin created → email: ${email}  password: ${password}`);
}

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`🚀 GDG MDC API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

const syncJob = startEventSyncJob();

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down…`);
  syncJob?.stop();
  server.close();
  await disconnectDB();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
