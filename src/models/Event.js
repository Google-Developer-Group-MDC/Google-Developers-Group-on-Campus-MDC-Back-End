import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ["gdg-community", "manual"], required: true },
    // Bevy (gdg.community.dev) event id — only set for synced events.
    externalId: { type: Number, default: null },
    title: { type: String, required: true, trim: true },
    descriptionShort: { type: String, default: "" },
    description: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    timezone: { type: String, default: "America/New_York" },
    audienceType: { type: String, enum: ["IN_PERSON", "VIRTUAL", "HYBRID"], default: "IN_PERSON" },
    eventType: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    url: { type: String, default: "" },
    location: { type: String, default: "" },
    tags: [{ type: String }],
    hostChapter: { type: String, default: "" },
    // Admin-controlled flags (preserved across syncs).
    hidden: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

eventSchema.index(
  { externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "number" } } }
);
eventSchema.index({ startDate: -1 });

export const Event = mongoose.model("Event", eventSchema);
