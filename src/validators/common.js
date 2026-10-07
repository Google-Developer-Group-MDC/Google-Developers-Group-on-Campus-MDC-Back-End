import { z } from "zod";

export const requiredText = (label, max = 100) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

export const optionalText = (max = 200) => z.string().trim().max(max).optional().default("");

export const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email("Please enter a valid email address"));

// Accepts common US formats: (305) 555-1234, 305-555-1234, +1 305 555 1234 …
export const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d\s().-]{7,20}$/, "Please enter a valid phone number");

// Hidden "company_website" honeypot field: real users never see it, so only bots fill it in.
export const honeypot = { company_website: z.string().max(500).optional().default("") };

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
