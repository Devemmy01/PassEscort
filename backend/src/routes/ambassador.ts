import { Router } from "express";
import { z } from "zod";
import { parse } from "../lib/http";
import { identity, requireAuth, type AuthedRequest } from "../middleware/auth";
import { dashboard, joinProgram, listBanks, requestPayout, resolveAccount, savePayoutAccount } from "../services/ambassador";
import { getOrCreateUser } from "../services/users";

const router = Router();
router.use(requireAuth);

const account = z.object({ bankCode: z.string().min(2).max(10), accountNumber: z.string().regex(/^\d{10}$/, "10 digits") });

router.post("/join", async (req: AuthedRequest, res) => {
  const user = await getOrCreateUser(identity(req));
  await joinProgram(String(user._id));
  res.json(await dashboard((await getOrCreateUser(identity(req)))));
});

router.get("/dashboard", async (req: AuthedRequest, res) => {
  res.json(await dashboard(await getOrCreateUser(identity(req))));
});

router.get("/banks", async (_req, res) => {
  res.json(await listBanks());
});

router.post("/payout-account/resolve", async (req: AuthedRequest, res) => {
  const { bankCode, accountNumber } = parse(account, req.body);
  res.json(await resolveAccount(await getOrCreateUser(identity(req)), bankCode, accountNumber));
});

router.put("/payout-account", async (req: AuthedRequest, res) => {
  const { bankCode, accountNumber } = parse(account, req.body);
  const user = await getOrCreateUser(identity(req));
  await savePayoutAccount(String(user._id), bankCode, accountNumber);
  res.json(await dashboard((await getOrCreateUser(identity(req)))));
});

router.post("/payouts", async (req: AuthedRequest, res) => {
  const user = await getOrCreateUser(identity(req));
  const { amount } = await requestPayout(String(user._id));
  res.json({ amount, dashboard: await dashboard(user) });
});

export default router;
