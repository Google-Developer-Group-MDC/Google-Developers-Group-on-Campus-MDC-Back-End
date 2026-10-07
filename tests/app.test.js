import { api } from "./helpers.js";

describe("app", () => {
  it("reports health", async () => {
    const res = await api().get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("returns JSON 404s", async () => {
    const res = await api().get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Route not found/);
  });

  it("allows whitelisted origins and blocks others", async () => {
    const allowed = await api().get("/api/health").set("Origin", "https://gdg-on-campus-mdc.netlify.app");
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://gdg-on-campus-mdc.netlify.app");

    const blocked = await api().get("/api/health").set("Origin", "https://evil.example");
    expect(blocked.status).toBe(403);
  });

  it("handles malformed JSON", async () => {
    const res = await api().post("/api/members").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
  });
});
