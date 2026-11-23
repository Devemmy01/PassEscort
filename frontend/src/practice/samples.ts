import { CBT_QUESTION_COUNT, CBT_SECONDS, pickQuestions } from './questions';
import { OPPONENTS, roundPoints, DUEL_ROUNDS, type CbtResult, type DuelOutcome } from './types';

/** Fixed sample data so the prototype index can deep-link to result screens. */
export function sampleCbtResult(subject = 'Physics'): CbtResult {
  const questions = pickQuestions(['JAMB'], subject, CBT_QUESTION_COUNT, 42);
  const answers: CbtResult['answers'] = {};
  questions.forEach((q, i) => {
    if (i % 9 === 8) return; // a few skipped
    const wrong = q.options.find((o) => o.key !== q.answerKey)?.key;
    answers[q.id] = i % 4 === 3 ? wrong : q.answerKey;
  });
  const correct = questions.filter((q) => answers[q.id] === q.answerKey).length;
  return {
    subject,
    questions,
    answers,
    flagged: questions.slice(5, 7).map((q) => q.id),
    secondsUsed: CBT_SECONDS - 6 * 60 - 12,
    secondsAllowed: CBT_SECONDS,
    xpEarned: correct * 10 + 25,
    timedOut: false,
  };
}

export function sampleDuelOutcome(won: boolean, subject = 'Mathematics'): DuelOutcome {
  const questions = pickQuestions(['JAMB', 'WAEC'], subject, DUEL_ROUNDS, 7);
  const pattern = won ? [1, 1, 0, 1, 1, 1, 0, 1, 1, 0] : [1, 0, 0, 1, 0, 1, 0, 0, 1, 0];
  const theirs = won ? [1, 0, 1, 0, 1, 0, 1, 0, 0, 1] : [1, 1, 1, 1, 0, 1, 1, 1, 0, 1];
  const rounds = questions.map((q, i) => ({
    questionId: q.id,
    myCorrect: pattern[i] === 1,
    mySeconds: 4 + ((i * 3) % 7),
    theirCorrect: theirs[i] === 1,
    theirSeconds: 5 + ((i * 5) % 8),
  }));
  return {
    subject,
    opponent: OPPONENTS[0],
    rounds,
    myScore: rounds.reduce((a, r) => a + roundPoints(r.myCorrect, r.mySeconds), 0),
    theirScore: rounds.reduce((a, r) => a + roundPoints(r.theirCorrect, r.theirSeconds), 0),
  };
}
