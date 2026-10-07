import { Router } from "express";
import { z } from "zod";
import * as admin from "../controllers/admin.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectId } from "../validators/common.js";
import { createEventSchema, updateEventSchema } from "../validators/event.js";
import { updateMemberSchema } from "../validators/member.js";
import { updatePartnerSchema } from "../validators/partner.js";

const router = Router();
const withId = validate(z.object({ id: objectId }), "params");

router.use(requireAdmin);

router.get("/stats", admin.stats);

router.get("/members", admin.members.list);
router.get("/members/export.csv", admin.members.exportCsv);
router.get("/members/:id", withId, admin.members.get);
router.patch("/members/:id", withId, validate(updateMemberSchema), admin.members.update);
router.delete("/members/:id", withId, admin.members.remove);

router.get("/partners", admin.partners.list);
router.get("/partners/export.csv", admin.partners.exportCsv);
router.get("/partners/:id", withId, admin.partners.get);
router.patch("/partners/:id", withId, validate(updatePartnerSchema), admin.partners.update);
router.delete("/partners/:id", withId, admin.partners.remove);

router.get("/events", admin.listAllEvents);
router.post("/events", validate(createEventSchema), admin.createEvent);
router.post("/events/sync", admin.syncEvents);
router.patch("/events/:id", withId, validate(updateEventSchema), admin.updateEvent);
router.delete("/events/:id", withId, admin.deleteEvent);

export default router;
