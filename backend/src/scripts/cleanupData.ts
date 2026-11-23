/**
 * Nightly cron: trims answer history the app no longer reads (services/cleanup.ts).
 *   0 1 * * *  cd /srv/passescort/backend && npm run db:cleanup     (02:00 in Lagos)
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { cleanupOldData } from "../services/cleanup";

connectDB()
  .then(() => cleanupOldData())
  .then((r) => console.log(`Cleanup: ${r.users} students checked, ${r.attemptsDeleted} old answers and ${r.sessionsDeleted} old sessions removed`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
