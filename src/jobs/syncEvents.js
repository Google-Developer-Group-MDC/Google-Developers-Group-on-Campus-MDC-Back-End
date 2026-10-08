import cron from "node-cron";
import { env } from "../config/env.js";
import { syncChapterStats } from "../services/gdgChapter.js";
import { syncGdgEvents } from "../services/gdgEvents.js";

async function runSync(trigger) {
  try {
    const result = await syncGdgEvents();
    console.log(`🔄 Events sync (${trigger}): ${result.upcoming} upcoming, ${result.past} past, ${result.removed} removed`);
  } catch (error) {
    console.error(`Events sync (${trigger}) failed:`, error.message);
  }
  try {
    const { gdgMembersCount } = await syncChapterStats();
    console.log(`👥 Chapter stats sync (${trigger}): ${gdgMembersCount} GDG members`);
  } catch (error) {
    console.error(`Chapter stats sync (${trigger}) failed:`, error.message);
  }
}

export function startEventSyncJob() {
  if (env.EVENTS_SYNC_CRON === "off") {
    console.log("⏸️  Automatic events sync disabled (EVENTS_SYNC_CRON=off)");
    return null;
  }
  if (!cron.validate(env.EVENTS_SYNC_CRON)) {
    console.error(`Invalid EVENTS_SYNC_CRON "${env.EVENTS_SYNC_CRON}" — automatic sync disabled.`);
    return null;
  }

  runSync("startup");
  return cron.schedule(env.EVENTS_SYNC_CRON, () => runSync("scheduled"));
}
