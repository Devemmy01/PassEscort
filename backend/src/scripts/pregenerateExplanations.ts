/**
 * Pre-generate AI explanations for the whole question bank, once, on the
 * providers' free tiers. Explanations are cached per question (shared by every
 * student), so after this run AI Explain is instant and costs nothing.
 *
 *   npm run ai:pregenerate                    # everything not yet cached
 *   npm run ai:pregenerate -- --limit 200     # a slice (e.g. one day's free quota)
 *   npm run ai:pregenerate -- --subject Physics
 *
 * Resumable: questions that already have an explanation are skipped, so run it
 * daily (cron) until it reports 0 left. Paces itself (AI_PREGEN_DELAY_MS,
 * default 2.5s ≈ 24/min, under Groq's 30 RPM) and, on a rate limit, waits and
 * retries; after repeated limits it stops cleanly — the daily quota is spent.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { env } from "../config/env";
import ExplanationModel from "../models/Explanation";
import Question from "../models/Question";
import { generate, RateLimitError } from "../services/ai";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export async function pregenerate(opts: { limit?: number; subject?: string; delayMs?: number; log?: (s: string) => void } = {}) {
  const log = opts.log ?? console.log;
  const delay = opts.delayMs ?? Number(process.env.AI_PREGEN_DELAY_MS ?? 2500);
  const done = new Set((await ExplanationModel.find({}, { _id: 1 }).lean()).map((e) => e._id));
  const filter = opts.subject ? { subject: opts.subject } : {};
  const todo = (await Question.find(filter).sort({ subject: 1, _id: 1 }).lean()).filter((q) => !done.has(q._id));
  const batch = todo.slice(0, opts.limit ?? todo.length);
  let made = 0;
  let failed = 0;
  let limits = 0;
  for (const q of batch) {
    try {
      const g = await generate(q);
      await ExplanationModel.updateOne({ _id: q._id }, { $set: { ...g.explanation, provider: g.provider, model: g.model } }, { upsert: true });
      made++;
      limits = 0;
      if (made % 25 === 0) log(`… ${made}/${batch.length}`);
    } catch (e) {
      if (e instanceof RateLimitError) {
        limits++;
        if (limits >= 3) {
          log(`Rate-limited repeatedly — today's free quota looks spent. Stopping; run again tomorrow.`);
          break;
        }
        const wait = e.retryAfterMs ?? 60_000;
        log(`${e.provider} rate limit — waiting ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      failed++;
      log(`✗ ${q._id}: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(delay);
  }
  const left = todo.length - made;
  return { made, failed, left };
}

if (require.main === module) {
  connectDB()
    .then(async () => {
      const e = env();
      console.log(`Pre-generating with ${e.AI_PROVIDER} (${e.AI_PROVIDER === "groq" ? e.GROQ_MODEL : e.AI_PROVIDER === "gemini" ? e.GEMINI_MODEL : "mock"})`);
      const limit = arg("limit") ? Number(arg("limit")) : undefined;
      const r = await pregenerate({ limit, subject: arg("subject") });
      console.log(`Made ${r.made}, failed ${r.failed}, ${r.left} questions still without an explanation.`);
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
