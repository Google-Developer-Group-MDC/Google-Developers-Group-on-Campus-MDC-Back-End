import { z } from "zod";
import { email, honeypot, optionalText, phone, requiredText } from "./common.js";
import { PARTNERSHIP_OPTIONS, PARTNER_STATUSES } from "./options.js";

export const createPartnerSchema = z.object({
  companyName: requiredText("Company name", 120),
  contactName: requiredText("Contact name", 100),
  email,
  phone,
  website: z.union([z.literal(""), z.url("Please enter a valid URL")]).optional().default(""),
  streetAddress: requiredText("Street address", 200),
  city: requiredText("City", 100),
  state: requiredText("State", 50),
  zip: z
    .string({ error: "ZIP code is required" })
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
  partnershipInterest: z.enum(PARTNERSHIP_OPTIONS, { error: "Please select a partnership interest" }),
  message: optionalText(2000),
  ...honeypot,
});

export const updatePartnerSchema = z
  .object({
    status: z.enum(PARTNER_STATUSES),
    notes: z.string().trim().max(2000),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");
