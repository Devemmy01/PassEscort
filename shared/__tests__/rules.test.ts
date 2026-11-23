import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BADGE_RULES, earnedBadges, type BadgeStats } from '../badges';
import { addDays, dayKey, daysBetween, monthKey, watHour, weekKey } from '../clock';
import { duelResult, roundPoints } from '../duel';
import { mastery, masteryLabel } from '../mastery';
import { resetsInLabel, shortName, weekResetsAt } from '../leaderboard';
import { completeSessionStreak, dailyGoalQuestions, NEW_STREAK, repairStreak, streakView } from '../streak';

test('days are Nigerian calendar days (WAT, UTC+1)', () => {
  assert.equal(dayKey(new Date('2026-11-21T22:59:59Z')), '2026-11-21');
  assert.equal(dayKey(new Date('2026-11-21T23:00:00Z')), '2026-11-22', 'midnight in Lagos is 23:00 UTC');
  assert.equal(watHour(new Date('2026-11-21T05:30:00Z')), 6);
  assert.equal(daysBetween('2026-11-28', '2026-12-02'), 4);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(monthKey(new Date('2026-11-30T23:30:00Z')), '2026-12');
});

test('streak grows once a day, pends overnight, breaks after a missed day', () => {
  let s = completeSessionStreak(NEW_STREAK, '2026-11-20').streak;
  assert.deepEqual(s, { days: 1, best: 1, lastActiveDay: '2026-11-20' });
  assert.equal(completeSessionStreak(s, '2026-11-20').grew, false, 'second session same day');
  s = completeSessionStreak(s, '2026-11-21').streak;
  assert.equal(s.days, 2);
  assert.deepEqual(streakView(s, '2026-11-21'), { state: 'active', days: 2, repairable: false });
  assert.deepEqual(streakView(s, '2026-11-22'), { state: 'pending', days: 2, repairable: false });
  assert.deepEqual(streakView(s, '2026-11-23'), { state: 'broken', days: 2, repairable: true });
  assert.deepEqual(streakView(s, '2026-11-24'), { state: 'broken', days: 0, repairable: false });
  assert.equal(completeSessionStreak(s, '2026-11-24').streak.days, 1, 'starts over');
  assert.equal(completeSessionStreak(s, '2026-11-24').streak.best, 2, 'best is kept');
});

test('repair works only inside the 48-hour window and continues the streak', () => {
  const s = { days: 12, best: 15, lastActiveDay: '2026-11-19' };
  const fixed = repairStreak(s, '2026-11-21')!;
  assert.equal(fixed.lastActiveDay, '2026-11-20');
  assert.equal(streakView(fixed, '2026-11-21').state, 'pending');
  assert.equal(completeSessionStreak(fixed, '2026-11-21').streak.days, 13);
  assert.equal(repairStreak(s, '2026-11-22'), null);
  assert.equal(repairStreak({ ...s, lastActiveDay: '2026-11-20' }, '2026-11-21'), null, 'nothing to repair');
});

test('daily goal: ~45 seconds a question, in fives', () => {
  assert.deepEqual([5, 10, 20, 30].map(dailyGoalQuestions), [5, 15, 25, 40]);
});

test('mastery weights hard and recent answers; under 5 answers is no verdict', () => {
  assert.equal(mastery([{ correct: true, difficulty: 'easy' }]), 0);
  const allRight = Array.from({ length: 10 }, () => ({ correct: true, difficulty: 'medium' as const }));
  assert.equal(mastery(allRight), 1);
  const improving = [...Array(10).fill({ correct: false, difficulty: 'medium' }), ...Array(10).fill({ correct: true, difficulty: 'medium' })];
  const declining = [...improving].reverse();
  assert.ok(mastery(improving) > mastery(declining), 'recent answers count more');
  assert.equal(masteryLabel(0.39), 'Needs work');
  assert.equal(masteryLabel(0.95), 'Mastered');
});

test('badges are earned exactly at their targets', () => {
  const base: BadgeStats = {
    sessionsCompleted: 0, questionsAnswered: 0, bestCorrectRun: 0, fastSprints: 0, perfectSprints: 0, bestStreak: 0,
    streakRepairs: 0, earlyDays: 0, nightDays: 0, duelsWon: 0, mastery: {}, subjects: [], friendsJoined: 0, shares: 0,
  };
  assert.deepEqual(earnedBadges(base), []);
  assert.deepEqual(earnedBadges({ ...base, sessionsCompleted: 1, questionsAnswered: 99 }), ['first-steps']);
  assert.ok(earnedBadges({ ...base, questionsAnswered: 100 }).includes('century'));
  assert.ok(earnedBadges({ ...base, bestStreak: 7 }).includes('on-fire'));
  const four = { English: 0.7, Mathematics: 0.8, Physics: 0.75, Chemistry: 0.9 };
  assert.ok(earnedBadges({ ...base, mastery: four, subjects: Object.keys(four) }).includes('all-rounder'));
  assert.ok(earnedBadges({ ...base, mastery: four, subjects: Object.keys(four) }).includes('subject-master'));
  assert.ok(!earnedBadges({ ...base, mastery: { ...four, English: 0.69 }, subjects: Object.keys(four) }).includes('all-rounder'));
  assert.equal(new Set(BADGE_RULES.map((b) => b.id)).size, 17);
});

test('duel scoring: 100 + up to 50 for speed; nothing for wrong', () => {
  assert.equal(roundPoints(true, 0), 150);
  assert.equal(roundPoints(true, 15), 100);
  assert.equal(roundPoints(true, 7.5), 125);
  assert.equal(roundPoints(false, 1), 0);
  assert.equal(duelResult(500, 400), 'win');
  assert.equal(duelResult(400, 400), 'draw');
});

test('weekly leaderboards use ISO weeks in Lagos time (reset Monday 00:00 WAT)', () => {
  assert.equal(weekKey(new Date('2026-11-21T12:00:00Z')), '2026-W47');
  assert.equal(weekKey(new Date('2026-11-22T22:59:00Z')), '2026-W47', 'Sunday 23:59 in Lagos');
  assert.equal(weekKey(new Date('2026-11-22T23:00:00Z')), '2026-W48', 'Monday 00:00 in Lagos');
  assert.equal(weekKey(new Date('2027-01-01T12:00:00Z')), '2026-W53');
  assert.equal(weekKey(new Date('2024-12-30T12:00:00Z')), '2025-W01');
});

test('leaderboard names, reset time and label', () => {
  assert.equal(shortName('Adaeze Okafor'), 'Adaeze O.');
  assert.equal(shortName('  Musa  '), 'Musa');
  assert.equal(shortName(''), 'Student');
  // Saturday noon UTC → Monday 00:00 WAT = Sunday 23:00 UTC
  assert.equal(weekResetsAt(new Date('2026-11-21T12:00:00Z')).toISOString(), '2026-11-22T23:00:00.000Z');
  // Monday 00:30 WAT → the following Monday
  assert.equal(weekResetsAt(new Date('2026-11-22T23:30:00Z')).toISOString(), '2026-11-29T23:00:00.000Z');
  assert.equal(resetsInLabel('2026-11-22T23:00:00.000Z', new Date('2026-11-21T12:00:00Z')), 'Resets in 1 day');
  assert.equal(resetsInLabel('2026-11-22T23:00:00.000Z', new Date('2026-11-22T20:30:00Z')), 'Resets in 3 hours');
});
