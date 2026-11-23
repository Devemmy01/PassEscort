import { Router } from "express";
import { z } from "zod";
import type { QuestionDTO, QuestionSyncResponse, TheorySolutionDTO } from "../../../shared/api";
import { HttpError, notFound, parse } from "../lib/http";
import { identity, requireAuth, type AuthedRequest } from "../middleware/auth";
import Question, { type QuestionDoc } from "../models/Question";
import TheorySolution from "../models/TheorySolution";
import { activePlan, getOrCreateUser } from "../services/users";

const router = Router();
router.use(requireAuth);

const PAGE = 500;

export function toDTO(q: QuestionDoc): QuestionDTO {
  return {
    id: q._id,
    subject: q.subject,
    examBody: q.examBody,
    year: q.year,
    topic: q.topic,
    difficulty: q.difficulty,
    prompt: q.prompt,
    options: q.options.map((o) => ({ key: o.key, text: o.text })),
    answerKey: q.answerKey,
    ...(q.explanation ? { explanation: q.explanation } : {}),
  };
}

/**
 * Content sync for the offline bank (PRD §11: MongoDB is the content source,
 * synced to the device). Pass the returned `cursor` back as `since`; an empty
 * page means the device is up to date.
 */
router.get("/sync", async (req, res) => {
  const { since } = parse(z.object({ since: z.string().max(80).optional() }), req.query);
  let filter = {};
  if (since) {
    const [at, id] = since.split("|");
    const t = new Date(at ?? "");
    if (Number.isNaN(t.getTime())) throw new HttpError(400, "invalid_cursor", "Bad cursor");
    filter = { $or: [{ updatedAt: { $gt: t } }, { updatedAt: t, _id: { $gt: id ?? "" } }] };
  }
  const docs = await Question.find(filter).sort({ updatedAt: 1, _id: 1 }).limit(PAGE).lean();
  const last = docs[docs.length - 1];
  const body: QuestionSyncResponse = {
    questions: docs.map(toDTO),
    cursor: last ? `${last.updatedAt.toISOString()}|${last._id}` : (since ?? ""),
  };
  res.json(body);
});

/**
 * Latest content cursor. A fresh install trusts its bundled bank and starts
 * syncing from here, so it never re-downloads questions it already has.
 */
router.get("/cursor", async (_req, res) => {
  const last = await Question.findOne({}, { updatedAt: 1 }).sort({ updatedAt: -1, _id: -1 }).lean();
  res.json({ cursor: last ? `${last.updatedAt.toISOString()}|${last._id}` : "" });
});

/** Full worked theory solution — paid content (PRD §5.8: paywall gates full solutions). */
router.get("/theory/:id/solution", async (req: AuthedRequest, res) => {
  const user = await getOrCreateUser(identity(req));
  if (activePlan(user, new Date()) === "free") throw new HttpError(402, "paywall", "Full worked solutions come with a Day Pass or Monthly plan.");
  const doc = await TheorySolution.findById(String(req.params.id)).lean();
  if (!doc) throw notFound("No solution for that question");
  const body: TheorySolutionDTO = { questionId: doc._id, parts: doc.parts.map((p) => ({ label: p.label, answer: p.answer, steps: p.steps })) };
  res.json(body);
});

export default router;
