/**
 * Hourly cron (it only sends in the evening, once per student per day):
 *   0 * * * *  cd /srv/passescort/backend && npm run push:reminders
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { sendStreakReminders } from "../services/reminders";

connectDB()
  .then(() => sendStreakReminders())
  .then((r) => console.log(`Reminders: ${r.pending} streaks ending tonight, ${r.repairable} repairable`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
