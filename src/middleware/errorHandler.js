import mongoose from "mongoose";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body" });
  }
  if (err?.message?.startsWith("Not allowed by CORS")) {
    return res.status(403).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({
    error: "Something went wrong. Please try again later.",
    ...(!env.isProduction && { details: err.message }),
  });
}
