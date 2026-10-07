import { Event } from "../models/Event.js";
import { HttpError } from "../utils/httpError.js";

// Public projection: the full HTML description stays server-side unless a single event is requested.
const LIST_FIELDS = "-description -__v -lastSyncedAt -hidden";

export function buildWhenFilter(when, now = new Date()) {
  if (when === "upcoming") {
    // An event is upcoming until it ends (or until it starts, if no end date is known).
    return { $or: [{ endDate: { $gte: now } }, { endDate: null, startDate: { $gte: now } }] };
  }
  if (when === "past") {
    return { $or: [{ endDate: { $lt: now } }, { endDate: null, startDate: { $lt: now } }] };
  }
  return {};
}

export async function listEvents(req, res) {
  const { when, limit } = req.validated.query;
  const events = await Event.find({ hidden: false, ...buildWhenFilter(when) })
    .sort({ featured: -1, startDate: when === "upcoming" ? 1 : -1 })
    .limit(limit)
    .select(LIST_FIELDS)
    .lean();
  res.json({ events });
}

export async function getEvent(req, res) {
  const event = await Event.findOne({ _id: req.params.id, hidden: false }).select("-__v -hidden").lean();
  if (!event) throw new HttpError(404, "Event not found");
  res.json({ event });
}
