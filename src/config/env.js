import "dotenv/config";
import { z } from "zod";

const DEFAULT_ORIGINS = [
  "https://gdg-on-campus-mdc.netlify.app",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
];

const emptyToUndefined = (value) => (value === "" ? undefined : value);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGINS: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.string().default("GDG on Campus MDC <no-reply@example.com>"),
  CLUB_NOTIFY_EMAIL: z.preprocess(emptyToUndefined, z.string().optional()),
  GDG_CHAPTER_ID: z.coerce.number().int().positive().default(2526),
  GDG_CHAPTER_URL: z
    .string()
    .default("https://gdg.community.dev/gdg-on-campus-miami-dade-college-miami-united-states/"),
  EVENTS_SYNC_CRON: z.string().default("0 */6 * * *"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === "production";

if (isProduction && !raw.MONGODB_URI) {
  console.error("MONGODB_URI is required in production.");
  process.exit(1);
}
if (isProduction && !raw.JWT_SECRET) {
  console.error("JWT_SECRET is required in production.");
  process.exit(1);
}

export const env = {
  ...raw,
  isProduction,
  isTest: raw.NODE_ENV === "test",
  // A fixed dev secret keeps local sessions valid across restarts; never used in production.
  JWT_SECRET: raw.JWT_SECRET ?? "dev-only-insecure-jwt-secret-change-me",
  corsOrigins: raw.CORS_ORIGINS
    ? raw.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_ORIGINS,
};
