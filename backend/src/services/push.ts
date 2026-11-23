/**
 * Push notifications (PRD §4: "Firebase Cloud Messaging (planned) — for
 * streak reminders, duel invites"). The app registers an Expo push token
 * (expo-notifications); messages go through Expo's push service, which
 * delivers via the project's Firebase Cloud Messaging credentials on Android
 * and APNs on iOS. Tokens the platforms report as dead are removed.
 */
import { env } from "../config/env";
import User from "../models/User";

export type PushKind = "reminders" | "duels" | "social";

export interface PushMessage {
  title: string;
  body: string;
  /** Read by the app when the notification is tapped (see frontend navigation/notifications.ts). */
  data: Record<string, string>;
}

/** PUSH_MODE=log: what would have been sent (local runs and tests). */
export const pushLog: { userId: string; token: string; message: PushMessage }[] = [];

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Send to every device of the given students who allow this kind of notification. Never throws. */
export async function notify(userIds: string[], kind: PushKind, message: PushMessage): Promise<number> {
  try {
    const users = await User.find({ _id: { $in: userIds }, [`notify.${kind}`]: { $ne: false }, "pushTokens.0": { $exists: true } }, { pushTokens: 1 }).lean();
    const targets = users.flatMap((u) => u.pushTokens.map((t) => ({ userId: String(u._id), token: t.token })));
    if (!targets.length) return 0;
    if (env().PUSH_MODE === "log") {
      for (const t of targets) pushLog.push({ ...t, message });
      return targets.length;
    }
    let sent = 0;
    for (let i = 0; i < targets.length; i += 100) {
      const batch = targets.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(env().EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env().EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(batch.map((t) => ({ to: t.token, title: message.title, body: message.body, data: message.data, sound: "default", channelId: kind, priority: "high" }))),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.warn(`Push batch failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
        continue;
      }
      const body = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
      const dead: string[] = [];
      body.data?.forEach((ticket, j) => {
        if (ticket.status === "ok") sent++;
        else if (ticket.details?.error === "DeviceNotRegistered") dead.push(batch[j]!.token);
      });
      if (dead.length) await User.updateMany({ "pushTokens.token": { $in: dead } }, { $pull: { pushTokens: { token: { $in: dead } } } });
    }
    return sent;
  } catch (e) {
    console.warn("Push failed:", e instanceof Error ? e.message : e);
    return 0;
  }
}
