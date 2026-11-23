import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrastRatio } from '../../theme/contrast';
import { allSubjects } from '../questions';
import { canonicalSubject, knownSubjects, SUBJECT_FAMILIES, subjectMeta } from '../subjects';

test('every subject in the question bank has designed iconography (no fallbacks)', () => {
  const known = new Set(knownSubjects());
  for (const s of allSubjects()) assert.ok(known.has(s), `${s} has no entry in src/practice/subjects.ts`);
});

test('the ten Figma subjects keep Figma’s Lucide glyphs', () => {
  const figma: Record<string, string> = {
    Mathematics: 'calculator',
    'English Language': 'bookText',
    Literature: 'bookOpenText',
    Physics: 'atom',
    Chemistry: 'flaskConical',
    Biology: 'dna',
    Agriculture: 'leaf',
    Economics: 'scale',
    Government: 'landmark',
    Geography: 'globe',
  };
  for (const [name, icon] of Object.entries(figma)) {
    assert.equal(subjectMeta(name).icon, icon, name);
    assert.equal(subjectMeta(name).source, 'figma', name);
  }
});

test('aliases resolve to the bank’s names', () => {
  assert.equal(canonicalSubject('English Language'), 'English');
  assert.equal(canonicalSubject('CRS'), 'Christian Religious Studies');
  assert.equal(canonicalSubject('literature'), 'Literature-in-English');
  assert.equal(canonicalSubject('Physics'), 'Physics');
});

test('short labels fit chips and duel headers', () => {
  for (const s of knownSubjects()) assert.ok(subjectMeta(s).short.length <= 13, s);
  assert.ok(subjectMeta('Some Brand New Vocational Subject').short.length <= 12, 'fallback is truncated');
});

test('subject tile glyphs clear 3:1 against their tile (WCAG 1.4.11)', () => {
  for (const [family, { fg, bg }] of Object.entries(SUBJECT_FAMILIES)) {
    assert.ok(contrastRatio(fg, bg) >= 3, `${family}: ${contrastRatio(fg, bg).toFixed(2)}`);
  }
});

test('glyphs are distinct within each family, so colour is never the only cue', () => {
  const seen = new Map<string, string>();
  for (const s of knownSubjects()) {
    const { icon, family } = subjectMeta(s);
    const key = `${family}:${icon}`;
    assert.ok(!seen.has(key), `${s} and ${seen.get(key)} share ${key}`);
    seen.set(key, s);
  }
});
