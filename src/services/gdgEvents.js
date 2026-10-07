import { env } from "../config/env.js";
import { Event } from "../models/Event.js";

const API_BASE = "https://gdg.community.dev/api/event_slim/for_chapter";
const FIELDS = [
  "id",
  "title",
  "description",
  "description_short",
  "start_date",
  "end_date",
  "event_timezone",
  "audience_type",
  "event_type_title",
  "cropped_picture_url",
  "cropped_banner_url",
  "url",
  "static_url",
  "chapter_title",
  "venue_name",
  "venue_address",
  "venue_city",
  "tags",
].join(",");

export function buildEventsUrl(chapterId, status) {
  const params = new URLSearchParams({
    status,
    include_cohosted_events: "true",
    visible_on_parent_chapter_only: "true",
    order: status === "Live" ? "start_date" : "-start_date",
    page_size: "100",
    fields: FIELDS,
  });
  return `${API_BASE}/${chapterId}/?${params}`;
}

// Follows the API's `links.next` pagination and returns every result.
async function fetchAllPages(url, fetchImpl) {
  const results = [];
  let next = url;
  let pages = 0;
  while (next && pages < 20) {
    const response = await fetchImpl(next, {
      headers: { Accept: "application/json", "User-Agent": "gdg-mdc-backend/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`gdg.community.dev responded with ${response.status}`);
    const body = await response.json();
    results.push(...(body.results ?? []));
    next = body.links?.next ?? null;
    pages += 1;
  }
  return results;
}

const AUDIENCE_TYPES = new Set(["IN_PERSON", "VIRTUAL", "HYBRID"]);

export function normalizeEvent(raw) {
  const location = [raw.venue_name, raw.venue_address, raw.venue_city].filter(Boolean).join(", ");
  return {
    source: "gdg-community",
    externalId: raw.id,
    title: raw.title?.trim() ?? "Untitled event",
    descriptionShort: raw.description_short ?? "",
    description: raw.description ?? "",
    startDate: new Date(raw.start_date),
    endDate: raw.end_date ? new Date(raw.end_date) : null,
    timezone: raw.event_timezone || "America/New_York",
    audienceType: AUDIENCE_TYPES.has(raw.audience_type) ? raw.audience_type : "IN_PERSON",
    eventType: raw.event_type_title ?? "",
    imageUrl: raw.cropped_picture_url ?? "",
    bannerUrl: raw.cropped_banner_url ?? "",
    url: raw.url || raw.static_url || "",
    location: location || (raw.audience_type === "VIRTUAL" ? "Online" : ""),
    hostChapter: raw.chapter_title ?? "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}

/**
 * Pulls upcoming (Live) and past (Completed) events for the chapter from gdg.community.dev
 * and upserts them by their Bevy id. Admin flags (hidden / featured) are left untouched.
 * Synced events that no longer exist upstream are removed.
 */
export async function syncGdgEvents({ chapterId = env.GDG_CHAPTER_ID, fetchImpl = fetch } = {}) {
  const [live, completed] = await Promise.all([
    fetchAllPages(buildEventsUrl(chapterId, "Live"), fetchImpl),
    fetchAllPages(buildEventsUrl(chapterId, "Completed"), fetchImpl),
  ]);

  const syncedAt = new Date();
  const events = [...live, ...completed].filter((raw) => raw?.id && raw.start_date).map(normalizeEvent);

  if (events.length) {
    await Event.bulkWrite(
      events.map((event) => ({
        updateOne: {
          filter: { externalId: event.externalId },
          update: { $set: { ...event, lastSyncedAt: syncedAt } },
          upsert: true,
        },
      }))
    );
  }

  const { deletedCount } = await Event.deleteMany({
    source: "gdg-community",
    externalId: { $nin: events.map((event) => event.externalId) },
  });

  return { upcoming: live.length, past: completed.length, total: events.length, removed: deletedCount, syncedAt };
}
