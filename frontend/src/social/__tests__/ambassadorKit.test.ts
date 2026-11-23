import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AMBASSADOR_RULES } from '../../game/referral';
import { kitTemplates, nextExamYear } from '../ambassadorKit';

const ARGS = { firstName: 'Adaeze', code: 'ADAEZE7K', link: 'https://passescort.app/r/ADAEZE7K', today: new Date(2026, 10, 21), questionCount: '1,800+' };

test('exam year rolls over once this year’s sittings are done', () => {
  assert.equal(nextExamYear(new Date(2026, 10, 21)), 2027, 'November → next year');
  assert.equal(nextExamYear(new Date(2027, 1, 10)), 2027, 'February → this year');
  assert.equal(nextExamYear(new Date(2027, 6, 1)), 2028, 'July → next year');
});

test('every template carries the code and link and the real reward', () => {
  const t = kitTemplates(ARGS);
  assert.equal(t.length, 4);
  for (const k of t) {
    assert.ok(k.text.includes(ARGS.code), k.channel);
    assert.ok(k.text.includes(ARGS.link), k.channel);
    assert.ok(k.text.includes(`${AMBASSADOR_RULES.inviteGems}`), k.channel);
    assert.ok(k.text.includes('2027'), k.channel);
  }
});

test('templates fit their channels', () => {
  const byChannel = Object.fromEntries(kitTemplates(ARGS).map((k) => [k.channel, k.text]));
  assert.ok(byChannel.status!.length <= 250, 'Status captions are read in seconds');
  assert.ok(byChannel['whatsapp-dm']!.length <= 400);
  assert.ok(byChannel.social!.length <= 2200, 'TikTok caption limit');
  assert.match(byChannel.social!, /#StudyWithAdaeze/);
  assert.match(byChannel.social!, /₦100.*₦800/s, 'prices come from PRODUCTS');
  assert.match(byChannel['whatsapp-group']!, /1,800\+ JAMB, WAEC and NECO practice questions/);
  for (const t of kitTemplates(ARGS)) assert.doesNotMatch(t.text, /real past questions|2010–2025/i, `${t.channel} must not overclaim`);
});
