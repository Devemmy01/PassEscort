import { Router } from "express";
import { z } from "zod";
import { parse } from "../lib/http";
import { identity, requireAuth, type AuthedRequest } from "../middleware/auth";
import { explain } from "../services/ai";
import { getOrCreateUser } from "../services/users";

const router = Router();
router.use(requireAuth);

router.post("/explain", async (req: AuthedRequest, res) => {
  const { questionId } = parse(z.object({ questionId: z.string().min(1).max(120) }), req.body);
  const user = await getOrCreateUser(identity(req));
  res.json(await explain(String(user._id), questionId));
});

export default router;
