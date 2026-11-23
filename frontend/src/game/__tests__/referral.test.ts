import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PRODUCTS } from '../pricing';
import {
  AMBASSADOR_RULES,
  canRequestPayout,
  commissionFor,
  DEMO_REFERRALS,
  earnings,
  isValidAccountNumber,
  isWellFormedCode,
  maskAccount,
  monthlyEarningsExample,
  normalizeCode,
  personalCode,
  purchaseStatus,
} from '../referral';

test('personal codes are first-name letters plus a readable 2-char suffix', () => {
  const code = personalCode('Adaeze Okafor', 7);
  assert.match(code, /^ADAEZE[A-HJ-NP-Z2-9]{2}$/);
  assert.equal(personalCode('Adaeze Okafor', 7), code, 'deterministic for a seed');
  assert.match(personalCode('Oluwadamilare', 3), /^OLUWAD..$/, 'name part capped at 6 letters');
  assert.match(personalCode('Chí-Ọ̀má', 3), /^CHIOMA..$/, 'diacritics and punctuation stripped');
  assert.match(personalCode('', 3), /^PASS..$/, 'falls back when there is no usable name');
  assert.ok(isWellFormedCode(code));
});

test('checkout accepts codes however students type them', () => {
  assert.equal(normalizeCode(' adaeze-7k '), 'ADAEZE7K');
  assert.ok(isWellFormedCode('adaeze 7k'));
  assert.ok(!isWellFormedCode('7K'), 'too short');
  assert.ok(!isWellFormedCode('ADA€ZE'), 'symbols');
  assert.ok(!isWellFormedCode('1ADAEZE'), 'must start with a letter');
});

test('commission is 20% of paid plans and nothing on gem packs', () => {
  assert.equal(commissionFor('monthly'), PRODUCTS.monthly.priceNaira * 0.2);
  assert.equal(commissionFor('day'), 20);
  assert.equal(commissionFor('gems-small'), 0);
  assert.equal(commissionFor('gems-large'), 0);
  assert.equal(monthlyEarningsExample(10), '₦1,600');
});

test('commission is pending through the refund window, then available', () => {
  assert.equal(purchaseStatus({ product: 'monthly', daysAgo: AMBASSADOR_RULES.holdDays - 1 }), 'pending');
  assert.equal(purchaseStatus({ product: 'monthly', daysAgo: AMBASSADOR_RULES.holdDays }), 'available');
  assert.equal(purchaseStatus({ product: 'monthly', daysAgo: 40, paid: true }), 'paid');
});

test('earnings add up for the demo ambassador', () => {
  const e = earnings(DEMO_REFERRALS);
  assert.equal(e.joined, 11);
  assert.equal(e.subscribed, 8);
  assert.equal(e.practising, 10);
  assert.equal(e.paid, 160);
  assert.equal(e.pending, 180);
  assert.equal(e.available, 1000);
  assert.equal(e.lifetime, e.pending + e.available + e.paid);
  assert.ok(canRequestPayout(e.available));
  assert.ok(!canRequestPayout(AMBASSADOR_RULES.payoutMinimum - 1));
  assert.deepEqual(earnings([]), { pending: 0, available: 0, paid: 0, lifetime: 0, joined: 0, practising: 0, subscribed: 0 });
});

test('payout account numbers are 10-digit NUBANs and are masked on receipts', () => {
  assert.ok(isValidAccountNumber('0123456789'));
  assert.ok(!isValidAccountNumber('012345678'));
  assert.ok(!isValidAccountNumber('01234567890'));
  assert.ok(!isValidAccountNumber('01234a6789'));
  assert.equal(maskAccount('0123456789'), '•••• 6789');
});
