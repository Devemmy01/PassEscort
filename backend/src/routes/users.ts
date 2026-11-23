import { Router } from "express";
import { z } from "zod";
import { EXAM_BODIES } from "../../../shared/types";
import { parse } from "../lib/http";
import { withLock } from "../lib/lock";
import { identity, requireAuth, type AuthedRequest } from "../middleware/auth";
import User from "../models/User";
import { awardBadges, buildMe, getOrCreateUser } from "../services/users";

const router = Router();
router.use(requireAuth);

/** The signed-in student: profile, progress, entitlement. Creates the profile on first call. */
router.get("/me", async (req: AuthedRequest, res) => {
  const user = await getOrCreateUser(identity(req));
  // Badges earned by others' actions (e.g. a friend joining) land on the next read.
  if (awardBadges(user, new Date()).length) await user.save();
  res.json(buildMe(user));
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  exams: z.array(z.enum(EXAM_BODIES as [string, ...string[]])).min(1).max(3).optional(),
  subjects: z.array(z.string().trim().min(1).max(60)).min(1).max(12).optional(),
  dailyMinutes: z.number().int().min(5).max(120).optional(),
  onboarded: z.boolean().optional(),
  notify: z.object({ reminders: z.boolean(), duels: z.boolean(), social: z.boolean() }).partial().optional(),
});

router.patch("/me", async (req: AuthedRequest, res) => {
  const patch = parse(profileSchema, req.body);
  const created = await getOrCreateUser(identity(req));
  const user = await withLock(String(created._id), async () => {
    const u = (await User.findById(created._id))!;
    if (patch.name !== undefined) u.name = patch.name;
    if (patch.exams !== undefined) u.exams = patch.exams as typeof u.exams;
    if (patch.subjects !== undefined) u.subjects = [...new Set(patch.subjects)];
    if (patch.dailyMinutes !== undefined) u.dailyMinutes = patch.dailyMinutes;
    if (patch.onboarded !== undefined) u.onboarded = patch.onboarded;
    if (patch.notify) u.notify = { ...{ reminders: true, duels: true, social: true }, ...(u.notify ?? {}), ...patch.notify };
    await u.save();
    return u;
  });
  res.json(buildMe(user));
});

const tokenSchema = z.object({ token: z.string().min(10).max(300), platform: z.enum(["android", "ios", "web"]) });

/** Register this device for push. A token belongs to whoever signed in on the device last. */
router.post("/me/push-token", async (req: AuthedRequest, res) => {
  const { token, platform } = parse(tokenSchema, req.body);
  const user = await getOrCreateUser(identity(req));
  await User.updateMany({ _id: { $ne: user._id }, "pushTokens.token": token }, { $pull: { pushTokens: { token } } });
  await withLock(String(user._id), async () => {
    const u = (await User.findById(user._id))!;
    u.pushTokens = [...u.pushTokens.filter((t) => t.token !== token), { token, platform, updatedAt: new Date() }].slice(-5);
    await u.save();
  });
  res.status(204).end();
});

/** Sign-out: stop sending to this device. */
router.delete("/me/push-token", async (req: AuthedRequest, res) => {
  const { token } = parse(tokenSchema.pick({ token: true }), req.body);
  const user = await getOrCreateUser(identity(req));
  await User.updateOne({ _id: user._id }, { $pull: { pushTokens: { token } } });
  res.status(204).end();
});

export default router;
