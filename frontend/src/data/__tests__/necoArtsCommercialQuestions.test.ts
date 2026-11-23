import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestions } from '../../db/validateQuestion';
import { createNodeSqliteExecutor } from '../../db/__tests__/nodeSqliteExecutor';
import { seedQuestions } from '../../db/seedQuestions';
import { searchQuestions } from '../../db/questionsRepository';
import necoArtsCommercialQuestions from '../necoArtsCommercialQuestions.json';
import { allSeedQuestions } from '../allQuestions';

test('every NECO Arts/Commercial question passes the real import validator', () => {
  const validated = validateQuestions(necoArtsCommercialQuestions);
  assert.equal(validated.length, necoArtsCommercialQuestions.length);
});

test('all NECO Arts/Commercial question ids are unique', () => {
  const ids = new Set(necoArtsCommercialQuestions.map((q) => q.id));
  assert.equal(ids.size, necoArtsCommercialQuestions.length);
});

test('every NECO Arts/Commercial question is tagged with examBody NECO', () => {
  assert.ok(necoArtsCommercialQuestions.every((q) => q.examBody === 'NECO'));
});

test('covers all nine Arts/Commercial subjects', () => {
  const expectedSubjects = [
    'Government',
    'Literature-in-English',
    'History',
    'Christian Religious Studies',
    'Islamic Religious Studies',
    'Geography',
    'Financial Accounting',
    'Commerce',
    'Office Practice',
  ];
  const subjects = new Set(necoArtsCommercialQuestions.map((q) => q.subject));
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

  const results = await searchQuestions(db, { subject: 'Government', examBody: 'NECO' });
  assert.ok(results.length > 0);
  assert.ok(results.every((q) => q.subject === 'Government' && q.examBody === 'NECO'));
});
