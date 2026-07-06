import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shopLocalDateStr, shopDayRangeUtc } from './datetime.ts';

test('shopLocalDateStr rolls to next local day for a late-UTC instant (MSK +3)', () => {
  // 2026-07-10T22:30:00Z + 3h = 2026-07-11T01:30 local -> local date is the 11th
  assert.equal(shopLocalDateStr(new Date('2026-07-10T22:30:00.000Z')), '2026-07-11');
});

test('shopLocalDateStr keeps the same date mid-day', () => {
  assert.equal(shopLocalDateStr(new Date('2026-07-10T09:00:00.000Z')), '2026-07-10');
});

test('shopDayRangeUtc returns 06:00Z..06:00Z next day for a MSK day', () => {
  const { fromUtc, toUtc } = shopDayRangeUtc('2026-07-10');
  // local 00:00 MSK on the 10th = 21:00Z on the 9th
  assert.equal(fromUtc.toISOString(), '2026-07-09T21:00:00.000Z');
  assert.equal(toUtc.toISOString(), '2026-07-10T21:00:00.000Z');
});
