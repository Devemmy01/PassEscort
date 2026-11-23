import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDeepLink } from '../linking';

test('duel and referral links, web and scheme forms', () => {
  assert.deepEqual(parseDeepLink('https://passescort.app/d/k7qm2x'), { kind: 'duel', code: 'K7QM2X' });
  assert.deepEqual(parseDeepLink('passescort://d/K7QM2X'), { kind: 'duel', code: 'K7QM2X' });
  assert.deepEqual(parseDeepLink('https://passescort.app/r/ADAEZE7K/'), { kind: 'referral', code: 'ADAEZE7K' });
  assert.deepEqual(parseDeepLink('passescort://r/ADAEZE7K?utm=wa'), { kind: 'referral', code: 'ADAEZE7K' });
});

test('anything else is ignored safely', () => {
  for (const url of [null, '', 'https://evil.example/d/K7QM2X', 'passescort://payment?reference=pe_1', 'https://passescort.app/d/', 'https://passescort.app/d/../../x', 'passescort://d/AB']) {
    assert.equal(parseDeepLink(url), null, String(url));
  }
});
