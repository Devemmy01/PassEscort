import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNodeSqliteExecutor } from './nodeSqliteExecutor';
import { seedQuestions } from '../seedQuestions';
import { getQuestionCount } from '../questionsRepository';
import sampleQuestions from '../../data/sampleQuestions.json';

test('seeds a fresh database and reports the inserted count', async () => {
  const db = createNodeSqliteExecutor();
  const result = await seedQuestions(db, sampleQuestions);

  assert.equal(result.skipped, false);
  assert.equal(result.questionCount, sampleQuestions.length);
  assert.equal(await getQuestionCount(db), sampleQuestions.length);
});

test('re-seeding identical data is skipped', async () => {
  const db = createNodeSqliteExecutor();
  await seedQuestions(db, sampleQuestions);
  const second = await seedQuestions(db, sampleQuestions);

  assert.equal(second.skipped, true);
  assert.equal(await getQuestionCount(db), sampleQuestions.length);
});

test('a changed dataset re-seeds and replaces the old rows', async () => {
  const db = createNodeSqliteExecutor();
  await seedQuestions(db, sampleQuestions);

  const trimmed = sampleQuestions.slice(0, 5);
  const result = await seedQuestions(db, trimmed);

  assert.equal(result.skipped, false);
  assert.equal(await getQuestionCount(db), 5);
});

test('force re-seeds even when the dataset is unchanged', async () => {
  const db = createNodeSqliteExecutor();
  await seedQuestions(db, sampleQuestions);
  const result = await seedQuestions(db, sampleQuestions, { force: true });

  assert.equal(result.skipped, false);
  assert.equal(await getQuestionCount(db), sampleQuestions.length);
});

test('an invalid record aborts the whole import without partial writes', async () => {
  const db = createNodeSqliteExecutor();
  await seedQuestions(db, sampleQuestions);

  const bad = [...sampleQuestions.slice(0, 3), { id: 'broken' }];
  await assert.rejects(() => seedQuestions(db, bad), /index 3/);

  // original data must be untouched since validation happens before the transaction
  assert.equal(await getQuestionCount(db), sampleQuestions.length);
});
