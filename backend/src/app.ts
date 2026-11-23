import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFound } from "./lib/http";
import aiRouter from "./routes/ai";
import ambassadorRouter from "./routes/ambassador";
import duelsRouter from "./routes/duels";
import healthRouter from "./routes/health";
import leaderboardRouter from "./routes/leaderboard";
import paymentsRouter from "./routes/payments";
import practiceRouter from "./routes/practice";
import questionsRouter from "./routes/questions";
import referralsRouter from "./routes/referrals";
import usersRouter from "./routes/users";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  // The API is read cross-origin by the app's web build; helmet's default CORP (same-origin) would block every response.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const origins = env().CORS_ORIGINS;
  app.use(cors({ origin: origins === "*" ? true : origins.split(",").map((o) => o.trim()) }));

  // Payments first: its webhook needs the raw body for signature checks.
  app.use("/payments", paymentsRouter);
  app.use(express.json({ limit: "512kb" }));

  app.use("/health", healthRouter);
  app.use("/users", usersRouter);
  app.use("/questions", questionsRouter);
  app.use("/practice", practiceRouter);
  app.use("/ai", aiRouter);
  app.use("/referrals", referralsRouter);
  app.use("/ambassador", ambassadorRouter);
  app.use("/duels", duelsRouter);
  app.use("/leaderboard", leaderboardRouter);

  app.use(() => {
    throw notFound("No such endpoint");
  });
  app.use(errorHandler);
  return app;
}
