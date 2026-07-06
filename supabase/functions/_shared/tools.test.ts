import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool, type BookingRepo, type ServiceRow } from './tools.ts';
import type { BookingInterval } from './availability.ts';

const SERVICES: ServiceRow[] = [
  { id: 's1', name: 'Ремонт прокола', duration_min: 30, price: 700 },
  { id: 's2', name: 'Шиномонтаж R17–R19', duration_min: 60, price: 2800 },
];

function makeRepo(overrides: Partial<BookingRepo> = {}, bookings: BookingInterval[] = []): BookingRepo {
  return {
    listServices: async () => SERVICES,
    getServiceById: async (id) => SERVICES.find((s) => s.id === id) ?? null,
    getBookingsForRange: async () => bookings,
    upsertClientByPhone: async () => 'client-1',
    createBooking: async () => 'booking-1',
    ...overrides,
  };
}

test('list_services returns the service menu', async () => {
  const r = await runTool('list_services', '{}', makeRepo());
  assert.equal(r.ok, true);
  assert.equal((r.data as any[]).length, 2);
});

test('get_available_slots reflects existing bookings', async () => {
  const r = await runTool('get_available_slots', JSON.stringify({ service_id: 's2', date: '2026-07-10' }), makeRepo());
  assert.equal(r.ok, true);
  assert.equal((r.data as any).service, 'Шиномонтаж R17–R19');
  assert.ok((r.data as any).slots.length > 0);
});

test('get_available_slots errors on unknown service', async () => {
  const r = await runTool('get_available_slots', JSON.stringify({ service_id: 'nope', date: '2026-07-10' }), makeRepo());
  assert.equal(r.ok, false);
  assert.equal(r.error, 'service_not_found');
});

test('create_booking succeeds for a free aligned slot', async () => {
  // 09:00 MSK on 2026-07-10 = 06:00Z; s2 is 60 min
  const r = await runTool(
    'create_booking',
    JSON.stringify({ client_name: 'Иван', phone: '+79990001122', service_id: 's2', start_at: '2026-07-10T06:00:00.000Z' }),
    makeRepo(),
  );
  assert.equal(r.ok, true);
  assert.equal((r.data as any).booking_id, 'booking-1');
});

test('create_booking rejects a slot already filled to capacity', async () => {
  const taken: BookingInterval[] = [
    { startAt: new Date('2026-07-10T06:00:00.000Z'), endAt: new Date('2026-07-10T07:00:00.000Z') },
    { startAt: new Date('2026-07-10T06:00:00.000Z'), endAt: new Date('2026-07-10T07:00:00.000Z') },
  ];
  const r = await runTool(
    'create_booking',
    JSON.stringify({ client_name: 'Иван', phone: '+79990001122', service_id: 's2', start_at: '2026-07-10T06:00:00.000Z' }),
    makeRepo({}, taken),
  );
  assert.equal(r.ok, false);
  assert.equal(r.error, 'slot_taken');
});

test('runTool rejects malformed arguments JSON', async () => {
  const r = await runTool('get_available_slots', '{not json', makeRepo());
  assert.equal(r.ok, false);
  assert.equal(r.error, 'invalid_arguments_json');
});
