/**
 * Load the question bank into MongoDB (the content source of truth, PRD §11).
 *
 *   npm run seed                      # reads ../frontend/src/data/*Questions.json
 *   npm run seed -- /path/to/data     # or another folder of *Questions.json files
 *
 * Idempotent: unchanged questions are left alone (so their `updatedAt`, and
 * therefore the app's content sync, doesn't move); changed ones are updated.
 * Also loads the full theory solutions (src/data/theory.ts).
 */
import "dotenv/config";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "../config/db";
import { THEORY_QUESTIONS } from "../data/theory";
import Question from "../models/Question";
import TheorySolution from "../models/TheorySolution";

const questionSchema = z
  .object({
    id: z.string().min(1).max(120),
    subject: z.string().min(1),
    examBody: z.enum(["JAMB", "WAEC", "NECO"]),
    year: z.number().int().min(1978).max(2100),
    topic: z.string().min(1),
    difficulty: z.enum(["easy", "medium", "hard"]),
    prompt: z.string().min(1),
    options: z.array(z.object({ key: z.string().min(1).max(2), text: z.string().min(1) })).min(2).max(5),
    answerKey: z.string().min(1).max(2),
    explanation: z.string().optional(),
  })
  .refine((q) => q.options.some((o) => o.key === q.answerKey), { message: "answerKey must be one of the options" });

export function loadQuestionFiles(dir: string): z.infer<typeof questionSchema>[] {
  const out: z.infer<typeof questionSchema>[] = [];
  for (const file of readdirSync(dir).filter((f) => /Questions\.json$/.test(f) && f !== "sampleQuestions.json")) {
    const raw = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    const list: unknown[] = Array.isArray(raw) ? raw : raw.questions;
    list.forEach((q, i) => {
      const r = questionSchema.safeParse(q);
      if (!r.success) throw new Error(`${file}[${i}]: ${r.error.issues.map((x) => x.message).join("; ")}`);
      out.push(r.data);
    });
  }
  const ids = new Set<string>();
  for (const q of out) {
    if (ids.has(q.id)) throw new Error(`Duplicate question id ${q.id}`);
    ids.add(q.id);
  }
  return out;
}

export async function seed(dir: string): Promise<{ questions: number; changed: number; theory: number }> {
  const questions = loadQuestionFiles(dir);
  let changed = 0;
  for (let i = 0; i < questions.length; i += 500) {
    const batch = questions.slice(i, i + 500);
    const existing = new Map((await Question.find({ _id: { $in: batch.map((q) => q.id) } }).lean()).map((q) => [q._id, q]));
    const ops = batch
      .filter((q) => {
        const e = existing.get(q.id);
        if (!e) return true;
        const { id: _id, ...rest } = q;
        const cur = { subject: e.subject, examBody: e.examBody, year: e.year, topic: e.topic, difficulty: e.difficulty, prompt: e.prompt, options: e.options.map((o) => ({ key: o.key, text: o.text })), answerKey: e.answerKey, ...(e.explanation ? { explanation: e.explanation } : {}) };
        return JSON.stringify(cur) !== JSON.stringify(rest);
      })
      .map((q) => {
        const { id, ...rest } = q;
        return { updateOne: { filter: { _id: id }, update: { $set: rest }, upsert: true } };
      });
    if (ops.length) await Question.bulkWrite(ops);
    changed += ops.length;
  }
  for (const t of THEORY_QUESTIONS) {
    await TheorySolution.updateOne({ _id: t.id }, { $set: { parts: t.parts.map((p) => ({ label: p.label, answer: p.answer, steps: p.steps })) } }, { upsert: true });
  }
  return { questions: questions.length, changed, theory: THEORY_QUESTIONS.length };
}

if (require.main === module) {
  // Default: the app's bundled bank, relative to backend/ (npm scripts run from there).
  const dir = path.resolve(process.argv[2] ?? path.join(process.cwd(), "../frontend/src/data"));
  connectDB()
    .then(() => seed(dir))
    .then((r) => console.log(`Seeded ${r.questions} questions (${r.changed} new or changed) and ${r.theory} theory solutions from ${dir}`))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
