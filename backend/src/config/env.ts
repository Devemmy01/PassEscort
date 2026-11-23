/**
 * Typed, validated environment. Every external service has a real mode and a
 * local "dev"/"mock" mode, so the whole product runs on a laptop without
 * keys — and production refuses to start in any dev mode.
 */
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  /** Public base URL of this API (payment return page, mock checkout). */
  PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  /** Deep-link host printed on share cards and invites. */
  LINK_HOST: z.string().url().default("https://passescort.app"),
  /** The app's URL scheme (app.json "scheme"), for returning from checkout. */
  APP_SCHEME: z.string().default("passescort"),
  CORS_ORIGINS: z.string().default("*"),

  AUTH_MODE: z.enum(["firebase", "dev"]).default("firebase"),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),

  AI_PROVIDER: z.enum(["groq", "gemini", "mock"]).default("groq"),
  GROQ_API_KEY: z.string().optional(),
  /** Free-tier model on Groq (Llama left Groq's free tier in 2026). */
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  GEMINI_API_KEY: z.string().optional(),
  /** Alias that tracks Google's current free Flash-Lite model. */
  GEMINI_MODEL: z.string().default("gemini-flash-lite-latest"),

  PAYMENTS_MODE: z.enum(["paystack", "mock"]).default("paystack"),
  PAYSTACK_SECRET_KEY: z.string().optional(),

  /**
   * Push notifications (PRD §4: Firebase Cloud Messaging). "expo" sends through
   * Expo's push service, which delivers via your Firebase project's FCM
   * credentials on Android and APNs on iOS. "log" records instead of sending.
   */
  PUSH_MODE: z.enum(["expo", "log"]).default("expo"),
  /** Optional: Expo access token, if "enhanced push security" is on for the project. */
  EXPO_ACCESS_TOKEN: z.string().optional(),

  /** Matchmaking falls back to a clearly labelled practice bot after this long (0 = never). */
  DUEL_BOT_AFTER_MS: z.coerce.number().int().min(0).default(20000),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  const env = parsed.data;
  const problems: string[] = [];
  if (env.NODE_ENV === "production") {
    if (env.AUTH_MODE !== "firebase") problems.push("AUTH_MODE must be firebase in production");
    if (env.PAYMENTS_MODE !== "paystack") problems.push("PAYMENTS_MODE must be paystack in production");
    if (env.AI_PROVIDER === "mock") problems.push("AI_PROVIDER cannot be mock in production");
  }
  if (env.AUTH_MODE === "firebase" && !env.FIREBASE_SERVICE_ACCOUNT_PATH && !env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    problems.push("FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON is required when AUTH_MODE=firebase");
  }
  if (env.PAYMENTS_MODE === "paystack" && !env.PAYSTACK_SECRET_KEY) problems.push("PAYSTACK_SECRET_KEY is required when PAYMENTS_MODE=paystack");
  if (env.AI_PROVIDER === "groq" && !env.GROQ_API_KEY) problems.push("GROQ_API_KEY is required when AI_PROVIDER=groq");
  if (env.AI_PROVIDER === "gemini" && !env.GEMINI_API_KEY) problems.push("GEMINI_API_KEY is required when AI_PROVIDER=gemini");
  if (problems.length) throw new Error(`Invalid environment:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  return env;
}

let current: Env | undefined;

export function env(): Env {
  if (!current) current = parseEnv(process.env);
  return current;
}

/** Tests and scripts can install an explicit environment. */
export function setEnv(next: Env): void {
  current = next;
}
