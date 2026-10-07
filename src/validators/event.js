import { z } from "zod";

const eventFields = {
  title: z.string().trim().min(1, "Title is required").max(200),
  descriptionShort: z.string().trim().max(500).optional().default(""),
  description: z.string().trim().max(20000).optional().default(""),
  startDate: z.coerce.date({ error: "A valid start date is required" }),
  endDate: z.coerce.date().optional().nullable(),
  timezone: z.string().trim().max(60).optional().default("America/New_York"),
  audienceType: z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]).optional().default("IN_PERSON"),
  eventType: z.string().trim().max(100).optional().default(""),
  imageUrl: z.union([z.literal(""), z.url()]).optional().default(""),
  bannerUrl: z.union([z.literal(""), z.url()]).optional().default(""),
  url: z.union([z.literal(""), z.url()]).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  hidden: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
};

export const createEventSchema = z.object(eventFields);

// Synced events only allow toggling visibility flags (their content comes from gdg.community.dev).
export const updateEventSchema = z
  .object({
    title: eventFields.title,
    descriptionShort: z.string().trim().max(500),
    description: z.string().trim().max(20000),
    startDate: eventFields.startDate,
    endDate: eventFields.endDate,
    timezone: z.string().trim().max(60),
    audienceType: z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]),
    eventType: z.string().trim().max(100),
    imageUrl: z.union([z.literal(""), z.url()]),
    bannerUrl: z.union([z.literal(""), z.url()]),
    url: z.union([z.literal(""), z.url()]),
    location: z.string().trim().max(200),
    hidden: z.boolean(),
    featured: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");

export const listEventsQuerySchema = z.object({
  when: z.enum(["upcoming", "past", "all"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
