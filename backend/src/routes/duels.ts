import { Router } from "express";
import { z } from "zod";
import type { DuelInviteDTO } from "../../../shared/api";
import { DUEL_INVITE_TTL_MS } from "../../../shared/duel";
import { levelFromXp } from "../../../shared/levels";
import { env } from "../config/env";
import { randomCode } from "../lib/codes";
import { notFound, parse } from "../lib/http";
import { identity, requireAuth, type AuthedRequest } from "../middleware/auth";
import Duel from "../models/Duel";
import DuelInvite from "../models/DuelInvite";
import Question from "../models/Question";
import User from "../models/User";
import { getOrCreateUser, isDuplicateKey } from "../services/users";
import { badRequest } from "../lib/http";

const router = Router();
router.use(requireAuth);

async function toDTO(invite: InstanceType<typeof DuelInvite>): Promise<DuelInviteDTO> {
  const from = await User.findById(invite.from, { name: 1, xp: 1 }).lean();
  return {
    code: invite.code,
    link: `${env().LINK_HOST}/d/${invite.code}`,
    subject: invite.subject,
    expiresAt: invite.expiresAt.toISOString(),
    from: { name: from?.name || "A friend", level: levelFromXp(from?.xp ?? 0).level },
    status: invite.acceptedBy ? "accepted" : invite.expiresAt.getTime() < Date.now() ? "expired" : "open",
  };
}

/** Create a one-opponent duel link (expires in 15 minutes). */
router.post("/invites", async (req: AuthedRequest, res) => {
  const { subject } = parse(z.object({ subject: z.string().min(1).max(60) }), req.body);
  if (!(await Question.exists({ subject }))) throw badRequest("unknown_subject", `No ${subject} questions yet.`);
  const user = await getOrCreateUser(identity(req));
  for (let i = 0; i < 5; i++) {
    try {
      const invite = await DuelInvite.create({ code: randomCode(6), from: user._id, subject, expiresAt: new Date(Date.now() + DUEL_INVITE_TTL_MS) });
      res.status(201).json(await toDTO(invite));
      return;
    } catch (e) {
      if (!isDuplicateKey(e)) throw e;
    }
  }
  throw new Error("Could not allocate an invite code");
});

router.get("/invites/:code", async (req, res) => {
  const invite = await DuelInvite.findOne({ code: String(req.params.code).toUpperCase() });
  if (!invite) throw notFound("This duel link doesn't exist.");
  res.json(await toDTO(invite));
});

/** The student's last 10 duels (Duel hub → Recent duels). */
router.get("/recent", async (req: AuthedRequest, res) => {
  const user = await getOrCreateUser(identity(req));
  const duels = await Duel.find({ "players.user": user._id }).sort({ endedAt: -1 }).limit(10).lean();
  res.json(
    duels.map((d) => {
      const me = d.players.find((p) => String(p.user) === String(user._id))!;
      const them = d.players.find((p) => p !== me)!;
      return { id: String(d._id), subject: d.subject, opponent: them.name, bot: them.bot, result: me.result, score: `${me.score}–${them.score}`, endedAt: d.endedAt.toISOString() };
    }),
  );
});

export default router;
