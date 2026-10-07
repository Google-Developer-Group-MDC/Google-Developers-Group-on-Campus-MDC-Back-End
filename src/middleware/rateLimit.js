import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const skip = () => env.isTest;

// Public form submissions: 10 per 15 minutes per IP.
export const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip,
  message: { error: "Too many submissions. Please try again in a few minutes." },
});

// Login attempts: 10 per 15 minutes per IP.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip,
  message: { error: "Too many login attempts. Please try again later." },
});
