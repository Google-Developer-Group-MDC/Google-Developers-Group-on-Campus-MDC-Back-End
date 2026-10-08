import { Event } from "../models/Event.js";
import { Member } from "../models/Member.js";
import { Partner } from "../models/Partner.js";
import { toCsv } from "../services/csv.js";
import { getMemberTotals, syncChapterStats } from "../services/gdgChapter.js";
import { syncGdgEvents } from "../services/gdgEvents.js";
import { HttpError } from "../utils/httpError.js";
import { buildWhenFilter } from "./events.js";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildFilter(query, searchFields) {
  const filter = {};
  if (query.status) filter.status = String(query.status);
  if (query.search) {
    const pattern = new RegExp(escapeRegex(String(query.search).trim()), "i");
    filter.$or = searchFields.map((field) => ({ [field]: pattern }));
  }
  return filter;
}

/** Builds list / update / delete / export handlers for a form-submission model. */
function submissionHandlers(Model, { searchFields, csvColumns, filename, label }) {
  return {
    async list(req, res) {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
      const filter = buildFilter(req.query, searchFields);
      const [items, total] = await Promise.all([
        Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Model.countDocuments(filter),
      ]);
      res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    },

    async get(req, res) {
      const item = await Model.findById(req.params.id).lean();
      if (!item) throw new HttpError(404, `${label} not found`);
      res.json({ item });
    },

    async update(req, res) {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after", runValidators: true }).lean();
      if (!item) throw new HttpError(404, `${label} not found`);
      res.json({ item });
    },

    async remove(req, res) {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) throw new HttpError(404, `${label} not found`);
      res.status(204).end();
    },

    async exportCsv(req, res) {
      const items = await Model.find(buildFilter(req.query, searchFields)).sort({ createdAt: -1 }).lean();
      const date = new Date().toISOString().slice(0, 10);
      res
        .type("text/csv")
        .attachment(`${filename}-${date}.csv`)
        .send(toCsv(items, csvColumns));
    },
  };
}

export const members = submissionHandlers(Member, {
  label: "Member",
  filename: "gdg-mdc-members",
  searchFields: ["firstName", "lastName", "email", "major"],
  csvColumns: [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "major", label: "Major" },
    { key: "year", label: "Year" },
    { key: "interests", label: "Interests" },
    { key: "hearAboutUs", label: "Heard About Us" },
    { key: "additionalInfo", label: "Additional Info" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Notes" },
    { key: "createdAt", label: "Joined" },
  ],
});

export const partners = submissionHandlers(Partner, {
  label: "Partner inquiry",
  filename: "gdg-mdc-partners",
  searchFields: ["companyName", "contactName", "email", "city"],
  csvColumns: [
    { key: "companyName", label: "Company" },
    { key: "contactName", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "website", label: "Website" },
    { key: "streetAddress", label: "Street Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "ZIP" },
    { key: "partnershipInterest", label: "Partnership Interest" },
    { key: "message", label: "Message" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Notes" },
    { key: "createdAt", label: "Submitted" },
  ],
});

export async function stats(req, res) {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [memberTotals, membersTotal, membersThisMonth, membersByStatus, partnersTotal, partnersByStatus, upcomingEvents, pastEvents, lastSynced] =
    await Promise.all([
      getMemberTotals(),
      Member.countDocuments(),
      Member.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Member.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Partner.countDocuments(),
      Partner.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Event.countDocuments({ hidden: false, ...buildWhenFilter("upcoming") }),
      Event.countDocuments({ hidden: false, ...buildWhenFilter("past") }),
      Event.findOne({ lastSyncedAt: { $ne: null } }).sort({ lastSyncedAt: -1 }).select("lastSyncedAt").lean(),
    ]);

  const toMap = (groups) => Object.fromEntries(groups.map((group) => [group._id, group.count]));
  res.json({
    members: {
      total: membersTotal,
      thisMonth: membersThisMonth,
      byStatus: toMap(membersByStatus),
      gdgChapter: memberTotals.gdgMembers,
      communityTotal: memberTotals.total,
    },
    partners: { total: partnersTotal, byStatus: toMap(partnersByStatus) },
    events: { upcoming: upcomingEvents, past: pastEvents, lastSyncedAt: lastSynced?.lastSyncedAt ?? null },
  });
}

// ─── Events ───────────────────────────────────────────────

export async function listAllEvents(req, res) {
  const events = await Event.find().sort({ startDate: -1 }).select("-description -__v").lean();
  res.json({ events });
}

export async function createEvent(req, res) {
  const event = await Event.create({ ...req.body, source: "manual" });
  res.status(201).json({ event });
}

const SYNCED_EDITABLE_FIELDS = new Set(["hidden", "featured"]);

export async function updateEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, "Event not found");

  if (event.source === "gdg-community") {
    const blocked = Object.keys(req.body).filter((key) => !SYNCED_EDITABLE_FIELDS.has(key));
    if (blocked.length) {
      throw new HttpError(
        400,
        `Synced events are managed on gdg.community.dev — only "hidden" and "featured" can be changed here.`
      );
    }
  }

  event.set(req.body);
  await event.save();
  res.json({ event });
}

export async function deleteEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, "Event not found");
  if (event.source === "gdg-community") {
    throw new HttpError(400, "Synced events can't be deleted (they'd return on the next sync). Hide it instead.");
  }
  await event.deleteOne();
  res.status(204).end();
}

export async function syncEvents(req, res) {
  try {
    const [events, chapter] = await Promise.all([syncGdgEvents(), syncChapterStats()]);
    res.json({ ...events, gdgMembersCount: chapter.gdgMembersCount });
  } catch (error) {
    throw new HttpError(502, `Could not sync events from gdg.community.dev: ${error.message}`);
  }
}
