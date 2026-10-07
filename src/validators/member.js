import { z } from "zod";
import { email, honeypot, optionalText, phone, requiredText } from "./common.js";
import { HEAR_ABOUT_OPTIONS, INTEREST_OPTIONS, MEMBER_STATUSES, YEAR_OPTIONS } from "./options.js";

export const createMemberSchema = z.object({
  firstName: requiredText("First name", 60),
  lastName: requiredText("Last name", 60),
  email,
  phone: z.union([z.literal(""), phone]).optional().default(""),
  major: requiredText("Major", 100),
  year: z.enum(YEAR_OPTIONS, { error: "Please select your year" }),
  interests: z.array(z.enum(INTEREST_OPTIONS)).max(INTEREST_OPTIONS.length).optional().default([]),
  hearAboutUs: z.union([z.literal(""), z.enum(HEAR_ABOUT_OPTIONS)]).optional().default(""),
  additionalInfo: optionalText(1000),
  ...honeypot,
});

export const updateMemberSchema = z
  .object({
    status: z.enum(MEMBER_STATUSES),
    notes: z.string().trim().max(2000),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");
