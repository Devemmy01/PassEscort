import { Router } from "express";
import { z } from "zod";
import { parse } from "../lib/http";
import { identity, requireAuth, type AuthedRequest } from "../middleware/auth";
import { redeemCode } from "../services/ambassador";
import { getOrCreateUser } from "../services/users";

const router = Router();
router.use(requireAuth);

/** Join with a friend's code (first 7 days). Gems for both land on the first completed practice. */
router.post("/redeem", async (req: AuthedRequest, res) => {
  const { code } = parse(z.object({ code: z.string().min(1).max(20) }), req.body);
  const user = await getOrCreateUser(identity(req));
  res.json(await redeemCode(String(user._id), code));
});

export default router;
