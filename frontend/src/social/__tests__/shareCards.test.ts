import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BADGES } from '../../game/badges';
import { LEVEL_TIERS } from '../../game/levels';
import { allSubjects } from '../../practice/questions';
import { duelWon, fitFontSize, scorePercent, SHARE_CARD_BASE, SHARE_CARD_EXPORT, shareMessage, tierArtFor } from '../shareCards';

const LINK = 'https://passescort.app/d/K7QM2X';

test('export keeps the Figma card proportions (609 × 696)', () => {
  assert.equal(SHARE_CARD_EXPORT.width, 1080);
  assert.ok(Math.abs(SHARE_CARD_EXPORT.width / SHARE_CARD_EXPORT.height - SHARE_CARD_BASE.width / SHARE_CARD_BASE.height) < 0.001);
});

test('scorePercent rounds and clamps', () => {
  assert.equal(scorePercent(34, 40), 85);
  assert.equal(scorePercent(0, 0), 0);
  assert.equal(scorePercent(41, 40), 100);
});

test('every caption carries the link and the real numbers', () => {
  const score = shareMessage({ kind: 'score', percent: 84, examBody: 'WAEC', subject: 'Biology' }, LINK);
  assert.match(score, /84% in WAEC Biology/);
  assert.ok(score.endsWith(LINK));
  assert.match(shareMessage({ kind: 'streak', days: 15 }, LINK), /15-day learning streak/);
  assert.match(shareMessage({ kind: 'level', level: 15, title: 'Scholar' }, LINK), /Level 15 \(Scholar\)/);
  for (const b of BADGES) assert.ok(shareMessage({ kind: 'badge', badgeId: b.id }, LINK).includes(b.name), b.id);
});

test('duel caption is honest about who won', () => {
  const won = { kind: 'duel', opponent: 'Tunde Bakare', myScore: 820, theirScore: 610, subject: 'Mathematics' } as const;
  const lost = { ...won, myScore: 540, theirScore: 700 };
  assert.ok(duelWon(won));
  assert.match(shareMessage(won, LINK), /I beat Tunde 820–610/);
  assert.ok(!duelWon(lost));
  assert.match(shareMessage(lost, LINK), /Tunde beat me 700–540/);
  assert.doesNotMatch(shareMessage(lost, LINK), /I beat/);
});

test('shield art is used only where Figma has one for that exact title', () => {
  assert.equal(tierArtFor('Scholar'), 'scholar');
  assert.equal(tierArtFor('UTME Legend'), 'legend');
  assert.equal(tierArtFor('Apprentice'), null, 'unknown titles fall back to the celebration pose');
  // Every level title has finished Figma shield art.
  for (const t of LEVEL_TIERS) assert.ok(tierArtFor(t.title), t.title);
});

test('fitFontSize keeps the base size for short text and shrinks long subjects', () => {
  assert.equal(fitFontSize('in WAEC', 250, 29, 22), 29);
  // 15 chars × 29 × 0.6 = 261 > 250, so it shrinks just enough: 250 / (15 × 0.6) = 27.7.
  assert.equal(fitFontSize('in WAEC Biology', 250, 29, 22), 27.7);
  assert.equal(fitFontSize('in NECO Christian Religious Studies', 250, 29, 22), 22, 'floors at min, then wraps');
  assert.equal(fitFontSize('84', 230, 168, 112), 168);
  // Capitals are wider: SHARPSHOOTER (12 × 0.74em) must shrink to fit 520 at 74 → 58.5.
  assert.equal(fitFontSize('SHARPSHOOTER', 520, 74, 40), 58.5);
  assert.equal(fitFontSize('SCHOLAR', 520, 74, 40), 74);
  const longest = allSubjects().reduce((a, b) => (b.length > a.length ? b : a));
  const size = fitFontSize(`in NECO ${longest}`, 250, 29, 22);
  assert.ok(size >= 22 && size <= 29);
});
