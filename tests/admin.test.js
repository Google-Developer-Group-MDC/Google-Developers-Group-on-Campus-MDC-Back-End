import { Member } from "../src/models/Member.js";
import { ADMIN, api, clearDatabase, loginAsAdmin, setupDatabase, teardownDatabase, validMember, validPartner } from "./helpers.js";

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

describe("auth", () => {
  it("rejects bad credentials", async () => {
    await loginAsAdmin();
    const res = await api().post("/api/auth/login").send({ ...ADMIN, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("returns the current admin without the password hash", async () => {
    const token = await loginAsAdmin();
    const res = await api().get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe(ADMIN.email);
    expect(res.body.admin.passwordHash).toBeUndefined();
  });

  it("protects admin routes", async () => {
    expect((await api().get("/api/admin/members")).status).toBe(401);
    expect((await api().get("/api/admin/members").set("Authorization", "Bearer nope")).status).toBe(401);
  });
});

describe("admin members", () => {
  let token;
  const auth = (req) => req.set("Authorization", `Bearer ${token}`);

  beforeEach(async () => {
    token = await loginAsAdmin();
    await api().post("/api/members").send(validMember());
    await api().post("/api/members").send({ ...validMember(), firstName: "David", email: "david@mymdc.net", major: "Cybersecurity" });
  });

  it("lists, searches and paginates", async () => {
    const all = await auth(api().get("/api/admin/members"));
    expect(all.body).toMatchObject({ total: 2, page: 1, pages: 1 });

    const search = await auth(api().get("/api/admin/members?search=cyber"));
    expect(search.body.items.map((m) => m.firstName)).toEqual(["David"]);
  });

  it("updates status and notes, then filters by status", async () => {
    const member = await Member.findOne({ firstName: "David" });
    const res = await auth(api().patch(`/api/admin/members/${member.id}`)).send({ status: "active", notes: "Paid dues" });
    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({ status: "active", notes: "Paid dues" });

    const active = await auth(api().get("/api/admin/members?status=active"));
    expect(active.body.total).toBe(1);
  });

  it("rejects invalid status values and ids", async () => {
    const member = await Member.findOne();
    expect((await auth(api().patch(`/api/admin/members/${member.id}`)).send({ status: "vip" })).status).toBe(400);
    expect((await auth(api().patch("/api/admin/members/123")).send({ status: "active" })).status).toBe(400);
  });

  it("deletes a member", async () => {
    const member = await Member.findOne();
    expect((await auth(api().delete(`/api/admin/members/${member.id}`))).status).toBe(204);
    expect(await Member.countDocuments()).toBe(1);
  });

  it("exports CSV", async () => {
    const res = await auth(api().get("/api/admin/members/export.csv"));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/gdg-mdc-members-.*\.csv/);
    const lines = res.text.split("\r\n");
    expect(lines[0]).toMatch(/^First Name,Last Name,Email/);
    expect(lines).toHaveLength(3);
  });

  it("returns stats", async () => {
    await api().post("/api/partners").send(validPartner());
    const res = await auth(api().get("/api/admin/stats"));
    expect(res.body.members).toMatchObject({ total: 2, thisMonth: 2, byStatus: { pending: 2 } });
    expect(res.body.partners).toMatchObject({ total: 1, byStatus: { new: 1 } });
  });
});
