// One-off manual sync from gdg.community.dev: npm run sync-events
import { connectDB, disconnectDB } from "../src/config/db.js";
import { syncGdgEvents } from "../src/services/gdgEvents.js";

await connectDB();
const result = await syncGdgEvents();
console.log("✅ Events synced:", result);
await disconnectDB();
