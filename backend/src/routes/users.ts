import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import User from "../models/User";

const router = Router();

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findOne({ firebaseUid: req.user!.uid });
  if (!user) {
    res.status(404).json({ error: "User profile not found" });
    return;
  }
  res.json(user);
});

router.post("/me", requireAuth, async (req: AuthedRequest, res) => {
  const { targetExam, subjects, dailyTargetMinutes } = req.body;

  const user = await User.findOneAndUpdate(
    { firebaseUid: req.user!.uid },
    {
      firebaseUid: req.user!.uid,
      email: req.user!.email,
      targetExam,
      subjects,
      dailyTargetMinutes,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json(user);
});

export default router;
