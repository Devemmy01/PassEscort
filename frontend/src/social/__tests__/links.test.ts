import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duelInviteLink, duelInviteMessage, makeCode, waMeUrl } from '../links';

test('makeCode is deterministic, fixed-length and avoids ambiguous characters', () => {
  assert.equal(makeCode(42), makeCode(42));
  assert.notEqual(makeCode(42), makeCode(43));
  for (let seed = 1; seed < 200; seed++) {
    const code = makeCode(seed);
    assert.equal(code.length, 6);
    assert.match(code, /^[A-HJ-NP-Z2-9]+$/);
    assert.ok(new Set(code).size >= 3, `degenerate code ${code} for seed ${seed}`);
  }
  assert.ok(new Set(Array.from({ length: 200 }, (_, i) => makeCode(Date.now() + i))).size > 190);
});

test('waMeUrl encodes the message and strips non-digits from the phone', () => {
  assert.equal(waMeUrl('Hi & bye'), 'https://wa.me/?text=Hi%20%26%20bye');
  assert.equal(waMeUrl('x', '+234 803-000-0000'), 'https://wa.me/2348030000000?text=x');
});

test('duel invite message carries the link and a correct article', () => {
  const link = duelInviteLink('ABC234');
  assert.ok(duelInviteMessage('Ada', 'Physics', link).endsWith(link));
  assert.match(duelInviteMessage('Ada', 'English', link), /to an English duel/);
  assert.match(duelInviteMessage('Ada', 'Physics', link), /to a Physics duel/);
});
