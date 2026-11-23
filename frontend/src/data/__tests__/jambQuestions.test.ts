import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestions } from '../../db/validateQuestion';
import { createNodeSqliteExecutor } from '../../db/__tests__/nodeSqliteExecutor';
import { seedQuestions } from '../../db/seedQuestions';
import { searchQuestions } from '../../db/questionsRepository';
import jambQuestions from '../jambQuestions.json';
import jambArtsCommercialQuestions from '../jambArtsCommercialQuestions.json';
import jambElectiveQuestions from '../jambElectiveQuestions.json';
import { allSeedQuestions } from '../allQuestions';

const allJamb = [...jambQuestions, ...jambArtsCommercialQuestions, ...jambElectiveQuestions];

test('every JAMB question passes the real import validator', () => {
  const validated = validateQuestions(allJamb);
  assert.equal(validated.length, allJamb.length);
});

test('all JAMB question ids are unique', () => {
  const ids = new Set(allJamb.map((q) => q.id));
  assert.equal(ids.size, allJamb.length);
});

test('every JAMB question is tagged with examBody JAMB', () => {
  assert.ok(allJamb.every((q) => q.examBody === 'JAMB'));
});

test('JAMB covers all twenty subjects, matching WAEC/NECO coverage', () => {
  const expectedSubjects = [
    'Mathematics',
    'English',
    'Physics',
    'Chemistry',
    'Biology',
    'Economics',
    'Government',
    'Literature-in-English',
    'History',
    'Christian Religious Studies',
    'Islamic Religious Studies',
    'Geography',
    'Financial Accounting',
    'Commerce',
    'Office Practice',
    'Fine Arts',
    'Music',
    'French',
    'Store Management',
    'Insurance',
    'Marketing',
  ];
  const subjects = new Set(allJamb.map((q) => q.subject));
  for (const subject of expectedSubjects) {
    assert.ok(subjects.has(subject), `missing subject: ${subject}`);
  }
});

test('the combined seed dataset has no id collisions across sources', () => {
  const ids = new Set(allSeedQuestions.map((q) => q.id));
  assert.equal(ids.size, allSeedQuestions.length);
});

test('the combined dataset seeds and is searchable end-to-end', async () => {
  const db = createNodeSqliteExecutor();
  const result = await seedQuestions(db, allSeedQuestions);
  assert.equal(result.questionCount, allSeedQuestions.length);

  const results = await searchQuestions(db, { subject: 'Mathematics', examBody: 'JAMB' });
  assert.ok(results.length > 0);
  assert.ok(results.every((q) => q.subject === 'Mathematics' && q.examBody === 'JAMB'));
});

test('the shipped bank is exactly the server seed set (no test fixtures)', async () => {
  const { readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const dir = join(__dirname, '..');
  const files = readdirSync(dir).filter((f) => /Questions\.json$/.test(f) && f !== 'sampleQuestions.json');
  let expected = 0;
  for (const f of files) expected += (await import(join(dir, f), { with: { type: 'json' } })).default.length;
  assert.equal(allSeedQuestions.length, expected);
  assert.ok(!allSeedQuestions.some((q) => q.id.startsWith('sample')), 'no fixture ids');
});

test('correct answers are spread across A–D (always picking one letter must not pay off)', () => {
  const counts: Record<string, number> = {};
  for (const q of allSeedQuestions) counts[q.answerKey] = (counts[q.answerKey] ?? 0) + 1;
  for (const key of ['A', 'B', 'C', 'D']) {
    const share = (counts[key] ?? 0) / allSeedQuestions.length;
    assert.ok(share > 0.15 && share < 0.35, `answer ${key} is ${(share * 100).toFixed(1)}% of the bank`);
  }
  // …and per subject, so no single subject can be gamed either.
  const bySubject = new Map<string, Record<string, number>>();
  for (const q of allSeedQuestions) {
    const c = bySubject.get(q.subject) ?? {};
    c[q.answerKey] = (c[q.answerKey] ?? 0) + 1;
    bySubject.set(q.subject, c);
  }
  for (const [subject, c] of bySubject) {
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    assert.ok(Math.max(...Object.values(c)) / total < 0.5, `${subject}: one letter is the answer to half the questions`);
  }
});
