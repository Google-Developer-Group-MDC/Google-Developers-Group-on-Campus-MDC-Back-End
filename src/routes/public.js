import { Router } from "express";
import mongoose from "mongoose";
import { createMember } from "../controllers/members.js";
import { createPartner } from "../controllers/partners.js";
import { getEvent, listEvents } from "../controllers/events.js";
import { getMemberTotals } from "../services/gdgChapter.js";
import { formLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { objectId } from "../validators/common.js";
import { listEventsQuerySchema } from "../validators/event.js";
import { createMemberSchema } from "../validators/member.js";
import { createPartnerSchema } from "../validators/partner.js";
import { z } from "zod";

const router = Router();
const idParams = z.object({ id: objectId });

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
  });
});

// Public numbers for the Home page "By The Numbers" section.
router.get("/stats", async (req, res) => {
  const { total, gdgMembers, siteMembers } = await getMemberTotals();
  res.set("Cache-Control", "public, max-age=60");
  res.json({ members: { total, gdgMembers, siteMembers } });
});

router.post("/members", formLimiter, validate(createMemberSchema), createMember);
router.post("/partners", formLimiter, validate(createPartnerSchema), createPartner);

router.get("/events", validate(listEventsQuerySchema, "query"), listEvents);
router.get("/events/:id", validate(idParams, "params"), getEvent);

export default router;
