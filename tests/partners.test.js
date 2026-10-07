import { Partner } from "../src/models/Partner.js";
import { api, clearDatabase, setupDatabase, teardownDatabase, validPartner } from "./helpers.js";

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

describe("POST /api/partners", () => {
  it("creates a partner inquiry", async () => {
    const res = await api().post("/api/partners").send(validPartner());
    expect(res.status).toBe(201);
    const saved = await Partner.findById(res.body.id).lean();
    expect(saved).toMatchObject({ companyName: "Acme Corp", status: "new" });
  });

  it("allows an empty website and message", async () => {
    const res = await api().post("/api/partners").send({ ...validPartner(), website: "", message: "" });
    expect(res.status).toBe(201);
  });

  it("validates ZIP, phone, website and partnership interest", async () => {
    const res = await api()
      .post("/api/partners")
      .send({ ...validPartner(), zip: "ABC", phone: "call me", website: "acme", partnershipInterest: "Free pizza" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(
      expect.arrayContaining(["zip", "phone", "website", "partnershipInterest"])
    );
  });
});
