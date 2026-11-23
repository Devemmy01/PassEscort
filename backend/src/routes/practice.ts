import { Router } from "express";
import { z } from "zod";
import { EXAM_BODIES } from "../../../shared/types";
import { parse } from "../lib/http";
import { identity, requireAuth, type AuthedRequest } from "../middleware/auth";
import { repair } from "../services/gamification";
import { syncPractice } from "../services/practice";
import { buildMe, getOrCreateUser } from "../services/users";

const router = Router();
router.use(requireAuth);

const id = z.string().min(1).max(64);
const iso = z.iso.datetime({ offset: true });

const syncSchema = z.object({
  sessions: z
    .array(
      z.object({
        id,
        mode: z.enum(["cbt", "objective"]),
        subject: z.string().min(1).max(60),
        examBody: z.enum(EXAM_BODIES as [string, ...string[]]),
        startedAt: iso,
        completedAt: iso.optional(),
        questionCount: z.number().int().min(1).max(200),
        secondsAllowed: z.number().int().min(0).max(4 * 3600).optional(),
        secondsUsed: z.number().int().min(0).max(4 * 3600).optional(),
      }),
    )
    .max(50),
  attempts: z
    .array(
      z.object({
        id,
        sessionId: id,
        questionId: z.string().min(1).max(120),
        selectedKey: z.string().min(1).max(2).nullable(),
        selectedText: z.string().max(2000).nullable().optional(),
        answeredAt: iso,
      }),
    )
    .max(500),
  shares: z.number().int().min(0).max(100).optional(),
});

/** The offline outbox flushes here. Idempotent: safe to retry after a dropped connection. */
router.post("/sync", async (req: AuthedRequest, res) => {
  const body = parse(syncSchema, req.body);
  const user = await getOrCreateUser(identity(req));
  res.json(await syncPractice(String(user._id), body as Parameters<typeof syncPractice>[1]));
});

router.post("/streak/repair", async (req: AuthedRequest, res) => {
  const { method } = parse(z.object({ method: z.enum(["gems", "plan"]) }), req.body);
  const user = await getOrCreateUser(identity(req));
  res.json(buildMe(await repair(String(user._id), method)));
});

export default router;
