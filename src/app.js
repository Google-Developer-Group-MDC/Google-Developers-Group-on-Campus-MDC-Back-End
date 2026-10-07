import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";

export function createApp() {
  const app = express();

  // Render, Railway, etc. sit behind a proxy — needed for correct client IPs in rate limiting.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / server-to-server requests (no Origin header) and whitelisted origins.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      exposedHeaders: ["Content-Disposition"],
    })
  );
  app.use(express.json({ limit: "100kb" }));
  if (!env.isTest) app.use(morgan(env.isProduction ? "combined" : "dev"));

  app.get("/", (req, res) => {
    res.json({ name: "GDG on Campus MDC API", docs: "https://github.com/Google-Developer-Group-MDC/Google-Developers-Group-on-Campus-MDC-Back-End#api-reference" });
  });

  app.use("/api", publicRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
