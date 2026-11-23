import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuestionValidationError, validateQuestion, validateQuestions } from '../validateQuestion';

const VALID = {
  id: 'q1',
  subject: 'Mathematics',
  examBody: 'JAMB',
  year: 2022,
  topic: 'Algebra',
  difficulty: 'easy',
  prompt: 'What is 1 + 1?',
  options: [
    { key: 'A', text: '1' },
    { key: 'B', text: '2' },
  ],
  answerKey: 'B',
};

test('accepts a well-formed question', () => {
  const result = validateQuestion(VALID, 0);
  assert.equal(result.id, 'q1');
  assert.equal(result.options.length, 2);
});

test('rejects a non-object record', () => {
  assert.throws(() => validateQuestion('nope', 3), /index 3/);
});

test('rejects an invalid examBody', () => {
  assert.throws(() => validateQuestion({ ...VALID, examBody: 'CAMBRIDGE' }, 0), (err: unknown) => {
    return err instanceof QuestionValidationError && /examBody/.test(err.message);
  });
});

test('rejects fewer than 2 options', () => {
  assert.throws(() => validateQuestion({ ...VALID, options: [{ key: 'A', text: 'only one' }] }, 0), /options/);
});

test('rejects an answerKey with no matching option', () => {
  assert.throws(() => validateQuestion({ ...VALID, answerKey: 'Z' }, 0), /answerKey/);
});

test('rejects a non-integer year', () => {
  assert.throws(() => validateQuestion({ ...VALID, year: 'twenty-twenty-two' }, 0), /year/);
});

test('validateQuestions reports the index of the first bad record', () => {
  assert.throws(() => validateQuestions([VALID, { ...VALID, id: '' }]), /index 1/);
});
