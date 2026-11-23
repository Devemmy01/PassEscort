import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestions } from '../../db/validateQuestion';
import { createNodeSqliteExecutor } from '../../db/__tests__/nodeSqliteExecutor';
import { seedQuestions } from '../../db/seedQuestions';
import { searchQuestions } from '../../db/questionsRepository';
import waecElectiveQuestions from '../waecElectiveQuestions.json';
import necoElectiveQuestions from '../necoElectiveQuestions.json';
import { allSeedQuestions } from '../allQuestions';

const expectedSubjects = ['Fine Arts', 'Music', 'French', 'Store Management', 'Insurance', 'Marketing'];

test('every WAEC elective question passes the real import validator', () => {
  const validated = validateQuestions(waecElectiveQuestions);
  assert.equal(validated.length, waecElectiveQuestions.length);
});

test('every NECO elective question passes the real import validator', () => {
  const validated = validateQuestions(necoElectiveQuestions);
  assert.equal(validated.length, necoElectiveQuestions.length);
});

test('all elective question ids are unique within and across WAEC/NECO', () => {
  const ids = new Set([...waecElectiveQuestions, ...necoElectiveQuestions].map((q) => q.id));
  assert.equal(ids.size, waecElectiveQuestions.length + necoElectiveQuestions.length);
});

test('WAEC electives are tagged WAEC and NECO electives are tagged NECO', () => {
  assert.ok(waecElectiveQuestions.every((q) => q.examBody === 'WAEC'));
  assert.ok(necoElectiveQuestions.every((q) => q.examBody === 'NECO'));
});

test('both exam bodies cover all six elective subjects', () => {
  const waecSubjects = new Set(waecElectiveQuestions.map((q) => q.subject));
  const necoSubjects = new Set(necoElectiveQuestions.map((q) => q.subject));
  for (const subject of expectedSubjects) {
    assert.ok(waecSubjects.has(subject), `WAEC missing subject: ${subject}`);
    assert.ok(necoSubjects.has(subject), `NECO missing subject: ${subject}`);
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

  const results = await searchQuestions(db, { subject: 'French' });
  assert.ok(results.length > 0);
  assert.ok(results.every((q) => q.subject === 'French'));
});
