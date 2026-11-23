import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestions } from '../../db/validateQuestion';
import { createNodeSqliteExecutor } from '../../db/__tests__/nodeSqliteExecutor';
import { seedQuestions } from '../../db/seedQuestions';
import { searchQuestions } from '../../db/questionsRepository';
import waecArtsCommercialQuestions from '../waecArtsCommercialQuestions.json';
import { allSeedQuestions } from '../allQuestions';

test('every WAEC Arts/Commercial question passes the real import validator', () => {
  const validated = validateQuestions(waecArtsCommercialQuestions);
  assert.equal(validated.length, waecArtsCommercialQuestions.length);
});

test('all WAEC Arts/Commercial question ids are unique', () => {
  const ids = new Set(waecArtsCommercialQuestions.map((q) => q.id));
  assert.equal(ids.size, waecArtsCommercialQuestions.length);
});

test('every WAEC Arts/Commercial question is tagged with examBody WAEC', () => {
  assert.ok(waecArtsCommercialQuestions.every((q) => q.examBody === 'WAEC'));
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
  const subjects = new Set(waecArtsCommercialQuestions.map((q) => q.subject));
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

  const results = await searchQuestions(db, { subject: 'Government', examBody: 'WAEC' });
  assert.ok(results.length > 0);
  assert.ok(results.every((q) => q.subject === 'Government' && q.examBody === 'WAEC'));
});
