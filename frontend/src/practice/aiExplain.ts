import type { Explanation } from '../../../shared/api';
import type { Question } from '../types/question';
import { questionById } from './questions';

export type { Explanation } from '../../../shared/api';
export type ExplanationStep = Explanation['steps'][number];

/**
 * Demo-mode stand-in for the Groq/Gemini response (PRD §5.5). Live builds call
 * POST /ai/explain; this keeps the prototype and review links working offline.
 * It reshapes the question's stored explanation into the same structure the
 * real endpoint must return, so the layout is designed against the contract.
 */
export function buildExplanation(q: Question): Explanation {
  const correct = q.options.find((o) => o.key === q.answerKey);
  const sentences = (q.explanation ?? `The correct answer is ${correct?.text ?? q.answerKey}.`)
    .replace(/([.!?])\s+(?=[A-Z(])/g, '$1\u0000')
    .split('\u0000')
    .map((s) => s.trim())
    .filter(Boolean);
  const working = sentences.map((s, i) => ({ title: i === 0 ? 'Work it out' : `Then`, body: s }));
  return {
    summary: `The answer is ${q.answerKey}: ${correct?.text ?? ''}`,
    steps: [
      { title: 'Understand the question', body: `This question tests ${q.topic}. Identify exactly what is being asked before looking at the options.` },
      ...working,
      { title: 'Check your answer', body: `Option ${q.answerKey} (${correct?.text ?? ''}) is the only one consistent with the working above.` },
    ],
    keyIdea: `${q.topic}: ${sentences[0] ?? ''}`,
    distractors: q.options
      .filter((o) => o.key !== q.answerKey)
      .slice(0, 3)
      .map((o) => ({ key: o.key, reason: `"${o.text}" does not match the result of the working — a common slip when rushing.` })),
  };
}

export function mockExplanation(questionId: string): Explanation {
  const q = questionById(questionId);
  if (!q) throw new Error(`Unknown question ${questionId}`);
  return buildExplanation(q);
}
