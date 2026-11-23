import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestions } from '../../db/validateQuestion';
import { createNodeSqliteExecutor } from '../../db/__tests__/nodeSqliteExecutor';
import { seedQuestions } from '../../db/seedQuestions';
import { searchQuestions } from '../../db/questionsRepository';
import necoQuestions from '../necoQuestions.json';
import { allSeedQuestions } from '../allQuestions';

test('every NECO question passes the real import validator', () => {
  const validated = validateQuestions(necoQuestions);
  assert.equal(validated.length, necoQuestions.length);
});

test('all NECO question ids are unique', () => {
  const ids = new Set(necoQuestions.map((q) => q.id));
  assert.equal(ids.size, necoQuestions.length);
});

test('every NECO question is tagged with examBody NECO', () => {
  assert.ok(necoQuestions.every((q) => q.examBody === 'NECO'));
});

test('the combined seed dataset has no id collisions across sources', () => {
  const ids = new Set(allSeedQuestions.map((q) => q.id));
  assert.equal(ids.size, allSeedQuestions.length);
});

test('the combined dataset seeds and is searchable end-to-end', async () => {
  const db = createNodeSqliteExecutor();
  const result = await seedQuestions(db, allSeedQuestions);
  assert.equal(result.questionCount, allSeedQuestions.length);

  const results = await searchQuestions(db, { subject: 'Mathematics', examBody: 'NECO' });
  assert.ok(results.length > 0);
  assert.ok(results.every((q) => q.subject === 'Mathematics' && q.examBody === 'NECO'));
});
