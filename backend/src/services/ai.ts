/**
 * AI step-by-step explanations (PRD §5.5): the question + official answer and
 * mark-scheme note go to Groq (or Gemini), which must return the Explanation
 * contract as JSON. Each question is generated once and cached for everyone.
 * Free students get FREE_AI_EXPLAINS_PER_DAY a day; paid plans are unlimited.
 * A failed generation never uses up quota.
 */
import { z } from "zod";
import type { Explanation, ExplainResponse } from "../../../shared/api";
import { dayKey } from "../../../shared/clock";
import { FREE_AI_EXPLAINS_PER_DAY } from "../../../shared/pricing";
import { env } from "../config/env";
import { HttpError, notFound } from "../lib/http";
import { withLock } from "../lib/lock";
import ExplanationModel from "../models/Explanation";
import Question, { type QuestionDoc } from "../models/Question";
import User from "../models/User";
import { activePlan, aiUsedToday } from "./users";

const explanationSchema = z.object({
  summary: z.string().min(1).max(400),
  steps: z.array(z.object({ title: z.string().min(1).max(80), body: z.string().min(1).max(600) })).min(1).max(6),
  keyIdea: z.string().min(1).max(300),
  distractors: z.array(z.object({ key: z.string().min(1).max(2), reason: z.string().min(1).max(300) })).max(5),
});

export function buildPrompt(q: QuestionDoc): string {
  const options = q.options.map((o) => `${o.key}. ${o.text}`).join("\n");
  return [
    `You are a patient Nigerian secondary-school tutor helping a student preparing for ${q.examBody} ${q.subject}.`,
    `Explain why the correct answer is right, in plain English a 16-year-old understands, in short steps.`,
    `Use the official answer below; never change it. Do not use LaTeX — write maths inline, e.g. "x² + 2x = 8".`,
    ``,
    `Question (${q.examBody} ${q.year}, topic: ${q.topic}):`,
    q.prompt,
    options,
    `Correct answer: ${q.answerKey}`,
    q.explanation ? `Official marking note: ${q.explanation}` : ``,
    ``,
    `Reply with JSON only, exactly this shape:`,
    `{"summary": "one sentence: the answer and why", "steps": [{"title": "short step title", "body": "1–3 sentences"}], "keyIdea": "the rule or idea to remember", "distractors": [{"key": "B", "reason": "why B is wrong, one sentence"}]}`,
    `Give 2–4 steps, and one distractor entry for each wrong option (${q.options.filter((o) => o.key !== q.answerKey).map((o) => o.key).join(", ")}).`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

/** Validate model output against the contract and the question itself. */
export function parseExplanation(raw: string, q: QuestionDoc): Explanation {
  const json = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  const e = explanationSchema.parse(json);
  const wrong = new Set(q.options.filter((o) => o.key !== q.answerKey).map((o) => o.key));
  return { ...e, distractors: e.distractors.filter((d) => wrong.has(d.key.toUpperCase())).map((d) => ({ ...d, key: d.key.toUpperCase() })) };
}

/** A provider said "slow down" (HTTP 429); `retryAfterMs` is its hint, if any. */
export class RateLimitError extends Error {
  constructor(
    readonly provider: string,
    readonly retryAfterMs: number | null,
  ) {
    super(`${provider} rate limit`);
  }
}

function retryAfter(res: Response): number | null {
  const h = Number(res.headers.get("retry-after"));
  return Number.isFinite(h) && h > 0 ? h * 1000 : null;
}

async function callGroq(prompt: string, jsonMode = true): Promise<string> {
  const { GROQ_API_KEY, GROQ_MODEL } = env();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 429) throw new RateLimitError("groq", retryAfter(res));
  if (!res.ok) {
    const text = await res.text();
    // Some models don't support JSON mode; the prompt already asks for JSON only, and parseExplanation validates it.
    if (jsonMode && res.status === 400 && /response_format|json/i.test(text)) return callGroq(prompt, false);
    throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");
  return text;
}

async function callGemini(prompt: string): Promise<string> {
  const { GEMINI_API_KEY, GEMINI_MODEL } = env();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 429) throw new RateLimitError("gemini", retryAfter(res));
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini returned no content");
  return text;
}

/** Local development stand-in, built from the stored explanation. Never used in production (config/env). */
function mockExplanation(q: QuestionDoc): Explanation {
  const answer = q.options.find((o) => o.key === q.answerKey)?.text ?? q.answerKey;
  return {
    summary: `The answer is ${q.answerKey}: ${answer}.`,
    steps: [
      { title: "Understand the question", body: `This is a ${q.topic} question. Work out exactly what is being asked before looking at the options.` },
      { title: "Work it out", body: q.explanation ?? `Apply the ${q.topic} rule to the information given.` },
      { title: "Check your answer", body: `Option ${q.answerKey} (${answer}) is the only one consistent with the working above.` },
    ],
    keyIdea: q.explanation ?? `Know the core ${q.topic} rule cold — it decides this question.`,
    distractors: q.options.filter((o) => o.key !== q.answerKey).map((o) => ({ key: o.key, reason: `"${o.text}" does not match the working — a common slip.` })),
  };
}

/** Generate (not cache) one explanation, trying the configured provider then the other. */
export async function generate(q: QuestionDoc): Promise<{ explanation: Explanation; provider: string; model: string }> {
  const e = env();
  if (e.AI_PROVIDER === "mock") return { explanation: mockExplanation(q), provider: "mock", model: "mock" };
  const prompt = buildPrompt(q);
  const providers: ("groq" | "gemini")[] = e.AI_PROVIDER === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];
  let lastError: unknown;
  for (const p of providers) {
    if (p === "groq" && !e.GROQ_API_KEY) continue;
    if (p === "gemini" && !e.GEMINI_API_KEY) continue;
    try {
      const raw = p === "groq" ? await callGroq(prompt) : await callGemini(prompt);
      return { explanation: parseExplanation(raw, q), provider: p, model: p === "groq" ? e.GROQ_MODEL : e.GEMINI_MODEL };
    } catch (err) {
      lastError = err;
      console.warn(`AI provider ${p} failed for ${q._id}:`, err instanceof Error ? err.message : err);
    }
  }
  if (lastError instanceof RateLimitError) throw lastError;
  throw new HttpError(502, "ai_unavailable", `The explanation service didn't respond${lastError ? "" : " (no provider configured)"}. This didn't use up a free explanation.`);
}

export async function explain(userId: string, questionId: string, now = new Date()): Promise<ExplainResponse> {
  const q = await Question.findById(questionId).lean();
  if (!q) throw notFound("No such question");

  // Check quota before spending a provider call.
  const user = await User.findById(userId);
  if (!user) throw notFound("No such user");
  const premium = activePlan(user, now) !== "free";
  if (!premium && aiUsedToday(user, now) >= FREE_AI_EXPLAINS_PER_DAY) {
    throw new HttpError(402, "ai_quota", `You've used your ${FREE_AI_EXPLAINS_PER_DAY} free explanations today.`);
  }

  let cached = true;
  let doc = await ExplanationModel.findById(questionId).lean();
  if (!doc) {
    cached = false;
    const g = await generate(q).catch((e: unknown) => {
      if (e instanceof RateLimitError) throw new HttpError(503, "ai_busy", "Lots of students are asking right now. Try again in a minute — this didn't use up a free explanation.");
      throw e;
    });
    doc = (await ExplanationModel.findOneAndUpdate({ _id: questionId }, { ...g.explanation, provider: g.provider, model: g.model }, { upsert: true, new: true }).lean())!;
  }

  // Only a delivered explanation counts against the quota.
  const left = await withLock(userId, async () => {
    const fresh = (await User.findById(userId))!;
    const today = dayKey(now);
    if (activePlan(fresh, now) !== "free") return null;
    const used = fresh.aiDay === today ? fresh.aiUsed : 0;
    if (used >= FREE_AI_EXPLAINS_PER_DAY) throw new HttpError(402, "ai_quota", `You've used your ${FREE_AI_EXPLAINS_PER_DAY} free explanations today.`);
    fresh.aiDay = today;
    fresh.aiUsed = used + 1;
    await fresh.save();
    return FREE_AI_EXPLAINS_PER_DAY - fresh.aiUsed;
  });

  const explanation: Explanation = { summary: doc.summary, steps: doc.steps, keyIdea: doc.keyIdea, distractors: doc.distractors };
  return { explanation, aiExplainsLeft: premium ? null : left, cached };
}
