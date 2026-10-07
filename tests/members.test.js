import { Member } from "../src/models/Member.js";
import { api, clearDatabase, setupDatabase, teardownDatabase, validMember } from "./helpers.js";

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

describe("POST /api/members", () => {
  it("creates a member and normalizes the email", async () => {
    const res = await api().post("/api/members").send(validMember());
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();

    const saved = await Member.findById(res.body.id).lean();
    expect(saved.email).toBe("maria.lopez@mymdc.net");
    expect(saved.status).toBe("pending");
    expect(saved.interests).toEqual(["Web Development", "Cloud Computing"]);
  });

  it("rejects duplicate emails with 409", async () => {
    await api().post("/api/members").send(validMember());
    const res = await api().post("/api/members").send({ ...validMember(), email: "MARIA.LOPEZ@mymdc.net" });
    expect(res.status).toBe(409);
    expect(await Member.countDocuments()).toBe(1);
  });

  it("returns field errors for invalid input", async () => {
    const res = await api()
      .post("/api/members")
      .send({ ...validMember(), email: "not-an-email", year: "Fifth", interests: ["Basket Weaving"] });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(["email", "year", "interests"]));
  });

  it("requires first name, last name, email, major and year", async () => {
    const res = await api().post("/api/members").send({});
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(
      expect.arrayContaining(["firstName", "lastName", "email", "major", "year"])
    );
  });

  it("silently drops honeypot submissions", async () => {
    const res = await api().post("/api/members").send({ ...validMember(), company_website: "http://spam.biz" });
    expect(res.status).toBe(201);
    expect(await Member.countDocuments()).toBe(0);
  });
});
