import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestions } from '../../db/validateQuestion';
import { createNodeSqliteExecutor } from '../../db/__tests__/nodeSqliteExecutor';
import { seedQuestions } from '../../db/seedQuestions';
import { searchQuestions } from '../../db/questionsRepository';
import waecQuestions from '../waecQuestions.json';
import { allSeedQuestions } from '../allQuestions';

test('every WAEC question passes the real import validator', () => {
  const validated = validateQuestions(waecQuestions);
  assert.equal(validated.length, waecQuestions.length);
});

test('all WAEC question ids are unique', () => {
  const ids = new Set(waecQuestions.map((q) => q.id));
  assert.equal(ids.size, waecQuestions.length);
});

test('every WAEC question is tagged with examBody WAEC', () => {
  assert.ok(waecQuestions.every((q) => q.examBody === 'WAEC'));
});

test('the combined seed dataset has no id collisions across sources', () => {
  const ids = new Set(allSeedQuestions.map((q) => q.id));
  assert.equal(ids.size, allSeedQuestions.length);
});

test('the combined dataset seeds and is searchable end-to-end', async () => {
  const db = createNodeSqliteExecutor();
  const result = await seedQuestions(db, allSeedQuestions);
  assert.equal(result.questionCount, allSeedQuestions.length);

  const results = await searchQuestions(db, { subject: 'Mathematics', examBody: 'WAEC' });
  assert.ok(results.length > 0);
  assert.ok(results.every((q) => q.subject === 'Mathematics' && q.examBody === 'WAEC'));
});
