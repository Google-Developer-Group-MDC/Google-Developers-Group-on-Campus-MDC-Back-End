import { ChapterStats } from "../src/models/ChapterStats.js";
import { Member } from "../src/models/Member.js";
import { chapterSlug, syncChapterStats } from "../src/services/gdgChapter.js";
import { api, clearDatabase, loginAsAdmin, setupDatabase, teardownDatabase, validMember } from "./helpers.js";

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

const chapterFetch = (membersCount) => async () => ({ ok: true, json: async () => ({ id: 2526, members_count: membersCount }) });

describe("chapter stats", () => {
  it("derives the chapter slug from the chapter URL", () => {
    expect(chapterSlug("https://gdg.community.dev/gdg-on-campus-miami-dade-college-miami-united-states/")).toBe(
      "gdg-on-campus-miami-dade-college-miami-united-states"
    );
  });

  it("stores the GDG member count and updates it on later syncs", async () => {
    await syncChapterStats({ fetchImpl: chapterFetch(338) });
    await syncChapterStats({ fetchImpl: chapterFetch(341) });
    const stats = await ChapterStats.find().lean();
    expect(stats).toHaveLength(1);
    expect(stats[0].gdgMembersCount).toBe(341);
  });

  it("rejects bad upstream responses without touching stored data", async () => {
    await syncChapterStats({ fetchImpl: chapterFetch(338) });
    await expect(syncChapterStats({ fetchImpl: async () => ({ ok: false, status: 500 }) })).rejects.toThrow(/500/);
    await expect(syncChapterStats({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }) })).rejects.toThrow(/members_count/);
    expect((await ChapterStats.findOne()).gdgMembersCount).toBe(338);
  });
});

describe("GET /api/stats", () => {
  it("adds site sign-ups (excluding inactive) to the GDG chapter count", async () => {
    await syncChapterStats({ fetchImpl: chapterFetch(338) });
    await api().post("/api/members").send(validMember());
    await api().post("/api/members").send({ ...validMember(), email: "second@mymdc.net" });
    await Member.updateOne({ email: "second@mymdc.net" }, { status: "inactive" });

    const res = await api().get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.members).toEqual({ total: 339, gdgMembers: 338, siteMembers: 1 });
  });

  it("works before the first sync", async () => {
    const res = await api().get("/api/stats");
    expect(res.body.members).toEqual({ total: 0, gdgMembers: 0, siteMembers: 0 });
  });

  it("is included in the admin stats", async () => {
    await syncChapterStats({ fetchImpl: chapterFetch(338) });
    const token = await loginAsAdmin();
    const res = await api().get("/api/admin/stats").set("Authorization", `Bearer ${token}`);
    expect(res.body.members).toMatchObject({ gdgChapter: 338, communityTotal: 338 });
  });
});
