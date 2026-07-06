import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableSlots, type BookingInterval } from './availability.ts';

// Helper: build a UTC Date from shop-local wall-clock on 2026-07-10 (MSK = UTC+3).
// local 09:00 -> UTC 06:00, so subtract 3h from the local hour.
function utc(localHour: number, localMin: number): Date {
  return new Date(Date.UTC(2026, 6, 10, localHour - 3, localMin));
}

test('empty day: 60-min service yields 09:00..20:00 every 30 min (23 slots)', () => {
  const slots = getAvailableSlots('2026-07-10', 60, []);
  assert.equal(slots.length, 23);
  assert.equal(slots[0].label, '09:00');
  assert.equal(slots[slots.length - 1].label, '20:00');
  // first slot's UTC start is 06:00 UTC
  assert.equal(slots[0].startAt.toISOString(), '2026-07-10T06:00:00.000Z');
});

test('service duration limits the last start time (120-min service ends by 21:00)', () => {
  const slots = getAvailableSlots('2026-07-10', 120, []);
  assert.equal(slots[slots.length - 1].label, '19:00');
});

test('with bays=2, one overlapping booking still leaves the slot available', () => {
  const bookings: BookingInterval[] = [{ startAt: utc(9, 0), endAt: utc(10, 0) }];
  const slots = getAvailableSlots('2026-07-10', 60, bookings);
  assert.ok(slots.some((s) => s.label === '09:00'));
});

test('with bays=2, two overlapping bookings remove the slot', () => {
  const bookings: BookingInterval[] = [
    { startAt: utc(9, 0), endAt: utc(10, 0) },
    { startAt: utc(9, 0), endAt: utc(10, 0) },
  ];
  const slots = getAvailableSlots('2026-07-10', 60, bookings);
  assert.ok(!slots.some((s) => s.label === '09:00'));
  assert.ok(!slots.some((s) => s.label === '09:30'));
});

test('overlap is half-open: a booking ending at 10:00 does not block a 10:00 start', () => {
  const bookings: BookingInterval[] = [
    { startAt: utc(9, 0), endAt: utc(10, 0) },
    { startAt: utc(9, 0), endAt: utc(10, 0) },
  ];
  const slots = getAvailableSlots('2026-07-10', 60, bookings);
  assert.ok(slots.some((s) => s.label === '10:00'));
});

test('a fully booked span (both bays) across the whole day yields no slots', () => {
  const bookings: BookingInterval[] = [
    { startAt: utc(9, 0), endAt: utc(21, 0) },
    { startAt: utc(9, 0), endAt: utc(21, 0) },
  ];
  const slots = getAvailableSlots('2026-07-10', 60, bookings);
  assert.equal(slots.length, 0);
});

test('bookings on a different day are ignored', () => {
  const other: BookingInterval[] = [
    { startAt: new Date(Date.UTC(2026, 6, 11, 6, 0)), endAt: new Date(Date.UTC(2026, 6, 11, 18, 0)) },
    { startAt: new Date(Date.UTC(2026, 6, 11, 6, 0)), endAt: new Date(Date.UTC(2026, 6, 11, 18, 0)) },
  ];
  const slots = getAvailableSlots('2026-07-10', 60, other);
  assert.equal(slots.length, 23);
});
