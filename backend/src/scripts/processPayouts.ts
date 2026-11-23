/**
 * Weekly ambassador payout run. Schedule on Fridays, e.g. cron:
 *   0 10 * * 5  cd /srv/passescort/backend && npm run payouts:process
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { processRequestedPayouts } from "../services/payouts";

connectDB()
  .then(() => processRequestedPayouts())
  .then((r) => console.log(`Payouts: ${r.sent} sent, ${r.failed} failed`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
