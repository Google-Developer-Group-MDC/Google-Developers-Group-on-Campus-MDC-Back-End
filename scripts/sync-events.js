// One-off manual sync from gdg.community.dev (events + member count): npm run sync-events
import { connectDB, disconnectDB } from "../src/config/db.js";
import { syncChapterStats } from "../src/services/gdgChapter.js";
import { syncGdgEvents } from "../src/services/gdgEvents.js";

await connectDB();
console.log("✅ Events synced:", await syncGdgEvents());
console.log("✅ Chapter stats synced:", await syncChapterStats());
await disconnectDB();
