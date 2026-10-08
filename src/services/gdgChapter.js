import { env } from "../config/env.js";
import { ChapterStats } from "../models/ChapterStats.js";
import { Member } from "../models/Member.js";

// "https://gdg.community.dev/<slug>/" → "<slug>"
export function chapterSlug(chapterUrl = env.GDG_CHAPTER_URL) {
  return new URL(chapterUrl).pathname.split("/").filter(Boolean).pop();
}

/** Fetches the chapter's member count from gdg.community.dev and stores it. */
export async function syncChapterStats({ chapterId = env.GDG_CHAPTER_ID, fetchImpl = fetch } = {}) {
  const url = `https://gdg.community.dev/api/chapter_slim/${chapterSlug()}/`;
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json", "User-Agent": "gdg-mdc-backend/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`gdg.community.dev responded with ${response.status}`);

  const body = await response.json();
  const gdgMembersCount = Number(body.members_count);
  if (!Number.isFinite(gdgMembersCount)) throw new Error("members_count missing from chapter response");

  await ChapterStats.updateOne(
    { chapterId },
    { $set: { gdgMembersCount, lastSyncedAt: new Date() } },
    { upsert: true }
  );
  return { gdgMembersCount };
}

/**
 * Community size shown on the website: members of the official GDG chapter plus
 * everyone who signed up through our own form (inactive members excluded).
 */
export async function getMemberTotals({ chapterId = env.GDG_CHAPTER_ID } = {}) {
  const [stats, siteMembers] = await Promise.all([
    ChapterStats.findOne({ chapterId }).lean(),
    Member.countDocuments({ status: { $ne: "inactive" } }),
  ]);
  const gdgMembers = stats?.gdgMembersCount ?? 0;
  return { total: gdgMembers + siteMembers, gdgMembers, siteMembers, lastSyncedAt: stats?.lastSyncedAt ?? null };
}
