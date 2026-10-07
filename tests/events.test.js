import { Event } from "../src/models/Event.js";
import { normalizeEvent, syncGdgEvents } from "../src/services/gdgEvents.js";
import { api, clearDatabase, loginAsAdmin, setupDatabase, teardownDatabase } from "./helpers.js";

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

const bevyEvent = (id, offsetDays, extra = {}) => ({
  id,
  title: `Event ${id}`,
  description: "<p>Full description</p>",
  description_short: "Short description",
  start_date: iso(offsetDays),
  end_date: iso(offsetDays + 0.1),
  event_timezone: "America/New_York",
  audience_type: "IN_PERSON",
  event_type_title: "Workshop",
  cropped_picture_url: "https://res.cloudinary.com/pic.png",
  cropped_banner_url: "https://res.cloudinary.com/banner.png",
  url: `https://gdg.community.dev/events/details/${id}/`,
  static_url: `https://gdg.community.dev/e/${id}/`,
  chapter_title: "GDG on Campus Miami Dade College",
  venue_name: "BIT Center",
  venue_address: "300 NE 2nd Ave",
  venue_city: "Miami",
  tags: ["AI"],
  ...extra,
});

// Fake fetch that serves Live/Completed pages like the gdg.community.dev API.
function fakeFetch({ live = [], completed = [] }) {
  return async (url) => {
    const status = new URL(url).searchParams.get("status");
    const results = status === "Live" ? live : completed;
    return { ok: true, json: async () => ({ links: { next: null }, count: results.length, results }) };
  };
}

describe("gdg.community.dev sync", () => {
  it("normalizes Bevy events", () => {
    const event = normalizeEvent(bevyEvent(1, 5));
    expect(event).toMatchObject({
      source: "gdg-community",
      externalId: 1,
      location: "BIT Center, 300 NE 2nd Ave, Miami",
      url: "https://gdg.community.dev/events/details/1/",
      eventType: "Workshop",
    });
  });

  it("upserts events, keeps admin flags and removes deleted ones", async () => {
    await syncGdgEvents({ fetchImpl: fakeFetch({ live: [bevyEvent(1, 5)], completed: [bevyEvent(2, -30), bevyEvent(3, -60)] }) });
    expect(await Event.countDocuments()).toBe(3);

    await Event.updateOne({ externalId: 2 }, { hidden: true });

    const result = await syncGdgEvents({
      fetchImpl: fakeFetch({ live: [bevyEvent(1, 5, { title: "Renamed" })], completed: [bevyEvent(2, -30)] }),
    });
    expect(result).toMatchObject({ upcoming: 1, past: 1, removed: 1 });
    expect((await Event.findOne({ externalId: 1 })).title).toBe("Renamed");
    expect((await Event.findOne({ externalId: 2 })).hidden).toBe(true);
    expect(await Event.exists({ externalId: 3 })).toBeNull();
  });

  it("does not remove manual events", async () => {
    await Event.create({ source: "manual", title: "Club social", startDate: new Date(Date.now() + DAY) });
    await syncGdgEvents({ fetchImpl: fakeFetch({}) });
    expect(await Event.countDocuments({ source: "manual" })).toBe(1);
  });

  it("throws on upstream errors", async () => {
    const failing = async () => ({ ok: false, status: 503 });
    await expect(syncGdgEvents({ fetchImpl: failing })).rejects.toThrow(/503/);
  });
});

describe("GET /api/events", () => {
  beforeEach(async () => {
    await syncGdgEvents({
      fetchImpl: fakeFetch({ live: [bevyEvent(10, 3), bevyEvent(11, 10)], completed: [bevyEvent(12, -5), bevyEvent(13, -90, { title: "Hidden" })] }),
    });
    await Event.updateOne({ externalId: 13 }, { hidden: true });
  });

  it("returns upcoming events soonest first without full descriptions", async () => {
    const res = await api().get("/api/events?when=upcoming");
    expect(res.status).toBe(200);
    expect(res.body.events.map((e) => e.externalId)).toEqual([10, 11]);
    expect(res.body.events[0].description).toBeUndefined();
  });

  it("returns past events newest first and excludes hidden ones", async () => {
    const res = await api().get("/api/events?when=past");
    expect(res.body.events.map((e) => e.externalId)).toEqual([12]);
  });

  it("respects the limit and validates query params", async () => {
    expect((await api().get("/api/events?limit=1")).body.events).toHaveLength(1);
    expect((await api().get("/api/events?when=tomorrow")).status).toBe(400);
  });

  it("returns a single event with its description", async () => {
    const event = await Event.findOne({ externalId: 10 });
    const res = await api().get(`/api/events/${event.id}`);
    expect(res.body.event.description).toBe("<p>Full description</p>");
  });
});

describe("admin events", () => {
  let token;
  const auth = (req) => req.set("Authorization", `Bearer ${token}`);

  beforeEach(async () => {
    token = await loginAsAdmin();
  });

  it("creates, edits and deletes manual events", async () => {
    const created = await auth(api().post("/api/admin/events")).send({
      title: "Officer Elections",
      startDate: iso(7),
      location: "Wolfson Campus",
    });
    expect(created.status).toBe(201);
    expect(created.body.event.source).toBe("manual");

    const id = created.body.event._id;
    const updated = await auth(api().patch(`/api/admin/events/${id}`)).send({ title: "Officer Elections 2026", featured: true });
    expect(updated.body.event).toMatchObject({ title: "Officer Elections 2026", featured: true });

    expect((await auth(api().delete(`/api/admin/events/${id}`))).status).toBe(204);
  });

  it("only allows hide/feature on synced events", async () => {
    await syncGdgEvents({ fetchImpl: fakeFetch({ live: [bevyEvent(20, 3)] }) });
    const event = await Event.findOne({ externalId: 20 });

    expect((await auth(api().patch(`/api/admin/events/${event.id}`)).send({ title: "Nope" })).status).toBe(400);
    expect((await auth(api().patch(`/api/admin/events/${event.id}`)).send({ hidden: true })).status).toBe(200);
    expect((await auth(api().delete(`/api/admin/events/${event.id}`))).status).toBe(400);
  });
});
