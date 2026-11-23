import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNodeSqliteExecutor } from './nodeSqliteExecutor';
import { seedQuestions } from '../seedQuestions';
import { buildFtsMatchQuery, getFilterFacets, getQuestionById, searchQuestions } from '../questionsRepository';
import sampleQuestions from '../../data/sampleQuestions.json';

async function seededDb() {
  const db = createNodeSqliteExecutor();
  await seedQuestions(db, sampleQuestions);
  return db;
}

test('buildFtsMatchQuery turns words into sanitized prefix terms', () => {
  assert.equal(buildFtsMatchQuery('mitochondria cell'), '"mitochondria"* "cell"*');
  assert.equal(buildFtsMatchQuery("what's up?"), '"whats"* "up"*');
  assert.equal(buildFtsMatchQuery('   '), null);
});

test('free-text search finds a question by prompt content', async () => {
  const db = await seededDb();
  const results = await searchQuestions(db, { query: 'mitochondrion' });

  assert.ok(results.length >= 1);
  assert.ok(results.some((q) => q.id === 'bio-jamb-2023-006'));
});

test('free-text search matches option text, not just the prompt', async () => {
  const db = await seededDb();
  const results = await searchQuestions(db, { query: 'ampere' });

  assert.ok(results.some((q) => q.id === 'phy-waec-2018-003'));
});

test('search-as-you-type: a partial prefix still matches', async () => {
  const db = await seededDb();
  const results = await searchQuestions(db, { query: 'mitoch' });

  assert.ok(results.some((q) => q.id === 'bio-jamb-2023-006'));
});

test('filtering by subject and examBody narrows results with no query', async () => {
  const db = await seededDb();
  const results = await searchQuestions(db, { subject: 'Physics', examBody: 'JAMB' });

  assert.ok(results.length > 0);
  assert.ok(results.every((q) => q.subject === 'Physics' && q.examBody === 'JAMB'));
});

test('query and filters combine (AND semantics)', async () => {
  const db = await seededDb();
  const results = await searchQuestions(db, { query: 'bond', subject: 'Chemistry' });

  assert.ok(results.length > 0);
  assert.ok(results.every((q) => q.subject === 'Chemistry'));
});

test('getFilterFacets returns distinct values for building filter UIs', async () => {
  const db = await seededDb();
  const facets = await getFilterFacets(db);

  assert.ok(facets.subjects.includes('Mathematics'));
  assert.ok(facets.examBodies.includes('JAMB'));
  assert.ok(facets.examBodies.includes('WAEC'));
  assert.ok(facets.topics.includes('Algebra'));
});

test('getQuestionById returns a fully-formed question with parsed options', async () => {
  const db = await seededDb();
  const question = await getQuestionById(db, 'math-jamb-2022-001');

  assert.ok(question);
  assert.equal(question?.answerKey, 'A');
  assert.equal(question?.options.length, 4);
});

test('getQuestionById returns null for an unknown id', async () => {
  const db = await seededDb();
  assert.equal(await getQuestionById(db, 'does-not-exist'), null);
});
