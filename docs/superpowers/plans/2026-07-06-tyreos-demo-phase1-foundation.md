# TYREOS Working Demo — Phase 1: Supabase Foundation & Slot Logic

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend foundation for the TYREOS demo — the database schema, security policies, seed data, shop config, and the pure availability (free-slot) function with full unit tests.

**Architecture:** Author Supabase Postgres migrations + seed as SQL files (applied to a live project at the Phase 1→2 handoff — see "Deferred verification"). Write the shop config as TypeScript constants and the availability calculation as a pure, runtime-agnostic TypeScript function that Phase 2's Deno Edge Functions will import. The availability function is the one logic-heavy unit and is built test-first with Node 24's native TypeScript test runner (no Deno or live database required for Phase 1).

**Tech Stack:** Supabase (Postgres), SQL, TypeScript, Node 24 built-in test runner (`node --test`, native `.ts` type-stripping).

## Global Constraints

- Provider is DeepSeek later; this phase touches no LLM code. Do not add LLM calls here.
- Shop config (verbatim from spec): working hours 09:00–21:00, `bays` (concurrent posts) = 2, slot granularity 30 min, timezone Europe/Moscow (fixed UTC+3, i.e. `utcOffsetMin = 180`).
- All timestamps stored in Postgres as `timestamptz` (UTC). The availability function works in UTC internally and converts to/from shop-local wall-clock using the fixed offset.
- Booking `status` ∈ {`booked`, `done`, `cancelled`}; `source` ∈ {`ai_chat`, `manual`} — exact string values, enforced by CHECK constraints (not Postgres enums).
- Security model: anon key may only `SELECT` `services`/`clients`/`bookings`; it has NO write access and NO access to `ai_usage`. All writes happen later via Edge Functions using the service-role key (which bypasses RLS). Do not add anon write policies.
- `availability.ts` must be a pure function with no I/O, no Deno/Node-specific APIs, and no external imports except `./config.ts` — so both Node (tests) and Deno (Phase 2) can import it unchanged.
- The landing site (`index.html`, `styles.css`, `script.js`, `assets/`) is frozen in this phase — do not modify it.
- Work happens on the existing `feature/working-demo` branch.

## Deferred verification (read before starting)

The SQL files (`0001_init_schema.sql`, `0002_rls_policies.sql`, `seed.sql`) cannot be applied to a real database in this phase because the user has not created the Supabase project yet. For those tasks, "verification" means a structured self-review against the stated checklist. They are applied and runtime-verified at the Phase 1→2 handoff (when the user creates the project), per `supabase/README.md` (Task 6). The availability function (Tasks 1–2) IS fully verified now via Node tests — that is Phase 1's working, testable deliverable.

## File structure

```
supabase/
  migrations/
    0001_init_schema.sql     -- Task 3: services, clients, bookings, ai_usage
    0002_rls_policies.sql    -- Task 4: enable RLS, anon SELECT-only policies
  seed.sql                   -- Task 5: static services + demo clients/bookings
  functions/
    _shared/
      config.ts              -- Task 1: shop config constants
      availability.ts        -- Task 2: pure free-slot function
      availability.test.ts   -- Task 2: Node --test unit tests
  README.md                  -- Task 6: how to stand up the backend (handoff doc)
```

---

### Task 1: Shop config constants

**Files:**
- Create: `supabase/functions/_shared/config.ts`

**Interfaces:**
- Produces: `SHOP_CONFIG` object with fields `utcOffsetMin: number`, `openHour: number`, `closeHour: number`, `bays: number`, `slotStepMin: number`. Task 2's `availability.ts` and its tests import this.

- [ ] **Step 1: Create `supabase/functions/_shared/config.ts`**

```ts
// Shop configuration for the single demo TYREOS tire shop.
// Europe/Moscow is a fixed UTC+3 offset (Russia has no DST), so we store the
// offset directly instead of depending on a timezone database. If the demo
// shop ever moves timezones, change utcOffsetMin here.
export const SHOP_CONFIG = {
  utcOffsetMin: 180, // Europe/Moscow, UTC+3
  openHour: 9, // shop opens 09:00 local
  closeHour: 21, // shop closes 21:00 local
  bays: 2, // number of concurrent work posts
  slotStepMin: 30, // booking slots start every 30 minutes
} as const;

export type ShopConfig = typeof SHOP_CONFIG;
```

- [ ] **Step 2: Sanity-check it parses**

Run: `node --check supabase/functions/_shared/config.ts`
Expected: no output, exit code 0 (file is syntactically valid; `node --check` strips types).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/config.ts
git commit -m "Add shop config constants for TYREOS demo backend"
```

---

### Task 2: Availability (free-slot) function — TDD

**Files:**
- Create: `supabase/functions/_shared/availability.ts`
- Test: `supabase/functions/_shared/availability.test.ts`

**Interfaces:**
- Consumes: `SHOP_CONFIG` from `./config.ts` (Task 1).
- Produces:
  - `interface BookingInterval { startAt: Date; endAt: Date }` — an existing booking's UTC start/end.
  - `interface AvailableSlot { startAt: Date; label: string }` — a free slot's UTC start `Date` and its `'HH:mm'` shop-local display label.
  - `function getAvailableSlots(dateStr: string, serviceDurationMin: number, existingBookings: BookingInterval[]): AvailableSlot[]` — `dateStr` is `'YYYY-MM-DD'` in shop-local time. Returns free slots for that day in chronological order. Phase 2's `get_available_slots` tool wraps this.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/_shared/availability.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test supabase/functions/_shared/`
Expected: FAIL — cannot resolve `./availability.ts` / `getAvailableSlots` is not defined.

- [ ] **Step 3: Implement `availability.ts`**

Create `supabase/functions/_shared/availability.ts`:

```ts
import { SHOP_CONFIG } from './config.ts';

export interface BookingInterval {
  startAt: Date;
  endAt: Date;
}

export interface AvailableSlot {
  startAt: Date;
  label: string;
}

// Convert a shop-local wall-clock time on `dateStr` (YYYY-MM-DD) to a UTC Date.
// local = UTC + offset, therefore UTC = local - offset.
function localToUtc(dateStr: string, localMinutes: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const localAsUtcMs = Date.UTC(y, m - 1, d, 0, 0) + localMinutes * 60_000;
  return new Date(localAsUtcMs - SHOP_CONFIG.utcOffsetMin * 60_000);
}

function labelFor(localMinutes: number): string {
  const hh = String(Math.floor(localMinutes / 60)).padStart(2, '0');
  const mm = String(localMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getAvailableSlots(
  dateStr: string,
  serviceDurationMin: number,
  existingBookings: BookingInterval[],
): AvailableSlot[] {
  const { openHour, closeHour, bays, slotStepMin } = SHOP_CONFIG;
  const openMin = openHour * 60;
  const closeMin = closeHour * 60;
  const slots: AvailableSlot[] = [];

  for (let startMin = openMin; startMin + serviceDurationMin <= closeMin; startMin += slotStepMin) {
    const startAt = localToUtc(dateStr, startMin);
    const endAt = localToUtc(dateStr, startMin + serviceDurationMin);
    const overlapping = existingBookings.filter(
      (b) => b.startAt < endAt && b.endAt > startAt,
    ).length;
    if (overlapping < bays) {
      slots.push({ startAt, label: labelFor(startMin) });
    }
  }

  return slots;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test supabase/functions/_shared/`
Expected: PASS — all 7 tests pass, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/availability.ts supabase/functions/_shared/availability.test.ts
git commit -m "Add pure availability (free-slot) function with unit tests"
```

---

### Task 3: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`

**Interfaces:**
- Produces: tables `services`, `clients`, `bookings`, `ai_usage` (columns below). Tasks 4 (RLS), 5 (seed), 6 (README), and all of Phase 2 depend on these names/columns.

- [ ] **Step 1: Create `supabase/migrations/0001_init_schema.sql`**

```sql
-- TYREOS demo — core schema.
-- gen_random_uuid() is provided by the pgcrypto extension, enabled by default on Supabase.

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_min integer not null check (duration_min > 0),
  price integer not null check (price >= 0),
  sort_order integer not null default 0
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists clients_phone_key on clients (phone);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  service_id uuid not null references services (id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'done', 'cancelled')),
  source text not null default 'manual' check (source in ('ai_chat', 'manual')),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index if not exists bookings_start_at_idx on bookings (start_at);

create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  kind text not null check (kind in ('chat', 'analyst')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_created_at_idx on ai_usage (created_at);
create index if not exists ai_usage_session_idx on ai_usage (session_id);
```

- [ ] **Step 2: Self-review against the schema checklist**

Confirm each item by reading the file (no DB to run against yet — see "Deferred verification"):
- All four tables present: `services`, `clients`, `bookings`, `ai_usage`.
- `bookings.client_id` → `clients(id)` `on delete cascade`; `bookings.service_id` → `services(id)` `on delete restrict`.
- `status` CHECK lists exactly `booked,done,cancelled`; `source` CHECK lists exactly `ai_chat,manual`; `ai_usage.kind` CHECK lists exactly `chat,analyst`.
- `bookings` has `check (end_at > start_at)`.
- `clients.phone` has a unique index (needed for Phase 2 upsert-by-phone).
- Every timestamp column is `timestamptz` (never `timestamp`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init_schema.sql
git commit -m "Add initial database schema migration"
```

---

### Task 4: Row-Level Security policies migration

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

**Interfaces:**
- Consumes: tables from Task 3.
- Produces: RLS enabled on all four tables; anon/authenticated `SELECT` policies on `services`, `clients`, `bookings` only.

- [ ] **Step 1: Create `supabase/migrations/0002_rls_policies.sql`**

```sql
-- TYREOS demo — Row-Level Security.
-- Enable RLS on every table. Grant only SELECT to the anon/authenticated roles on the
-- three tables the demo admin views read. Writes are performed exclusively by Edge
-- Functions using the service_role key, which bypasses RLS entirely (no policy needed).
-- ai_usage is internal: it gets NO anon policy, so the browser cannot read or write it.
-- Note: all client data in this demo is fabricated, so public-read on clients is acceptable
-- here; a real product would restrict it.

alter table services enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;
alter table ai_usage enable row level security;

create policy "public read services" on services
  for select using (true);

create policy "public read clients" on clients
  for select using (true);

create policy "public read bookings" on bookings
  for select using (true);
```

- [ ] **Step 2: Self-review against the RLS checklist**

- `enable row level security` appears for all four tables (`services`, `clients`, `bookings`, `ai_usage`).
- Exactly three policies exist, all `for select using (true)`, on `services`/`clients`/`bookings`.
- No policy references `ai_usage` (it must be unreadable by anon).
- No `for insert` / `for update` / `for delete` policy exists anywhere (anon must not write).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql
git commit -m "Add RLS policies: anon read-only, no writes"
```

---

### Task 5: Seed data

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: schema from Task 3.
- Produces: 6 static services, 3 demo clients, and 3 demo bookings (one past `done`, one today `booked`, one future `booked`) so the admin views and AI Analyst have believable data.

- [ ] **Step 1: Create `supabase/seed.sql`**

```sql
-- TYREOS demo — seed data. Safe to re-run: clears demo rows first.
-- Booking times are anchored to now() so the demo always looks current. These are UTC-based
-- approximations for realism; the Phase 6 demo-reset regenerates them against shop hours.

truncate table bookings, ai_usage, clients restart identity cascade;
delete from services;

insert into services (name, duration_min, price, sort_order) values
  ('Шиномонтаж R13–R16', 45, 2000, 1),
  ('Шиномонтаж R17–R19', 60, 2800, 2),
  ('Шиномонтаж R20–R22', 75, 3600, 3),
  ('Ремонт прокола', 30, 700, 4),
  ('Балансировка колёс', 40, 1600, 5),
  ('Сезонное хранение шин', 20, 3000, 6);

insert into clients (name, phone, notes) values
  ('Иван Петров', '+79161234567', 'Постоянный клиент, Toyota Camry'),
  ('Мария Смирнова', '+79267654321', null),
  ('Алексей Кузнецов', '+79031112233', 'Приезжает на сезонную замену');

-- Past booking (done)
insert into bookings (client_id, service_id, start_at, end_at, status, source)
select
  (select id from clients where phone = '+79161234567'),
  (select id from services where name = 'Балансировка колёс'),
  date_trunc('day', now()) - interval '1 day' + interval '15 hours',
  date_trunc('day', now()) - interval '1 day' + interval '15 hours 40 minutes',
  'done', 'manual';

-- Today booking (booked, created by AI)
insert into bookings (client_id, service_id, start_at, end_at, status, source)
select
  (select id from clients where phone = '+79267654321'),
  (select id from services where name = 'Шиномонтаж R17–R19'),
  date_trunc('day', now()) + interval '11 hours',
  date_trunc('day', now()) + interval '12 hours',
  'booked', 'ai_chat';

-- Future booking (booked)
insert into bookings (client_id, service_id, start_at, end_at, status, source)
select
  (select id from clients where phone = '+79031112233'),
  (select id from services where name = 'Сезонное хранение шин'),
  date_trunc('day', now()) + interval '2 days' + interval '10 hours',
  date_trunc('day', now()) + interval '2 days' + interval '10 hours 20 minutes',
  'booked', 'manual';
```

- [ ] **Step 2: Self-review against the seed checklist**

- `truncate ... restart identity cascade` and `delete from services` make the seed idempotent (re-runnable).
- All 6 services have `duration_min` matching the spec's service list; prices are non-negative integers.
- All 3 client phone numbers are distinct (unique index in Task 3 would otherwise reject them).
- Each booking's `service_id`/`client_id` subselect references a name/phone that exists above; each `end_at` is after `start_at`; `status`/`source` values are within the allowed CHECK sets.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "Add seed data: services, demo clients and bookings"
```

---

### Task 6: Backend stand-up README (Phase 1→2 handoff doc)

**Files:**
- Create: `supabase/README.md`

**Interfaces:**
- Consumes: all files from Tasks 1–5. This is the document the user follows to create the Supabase project and apply Phase 1's SQL — the point at which the SQL gets its real runtime verification.

- [ ] **Step 1: Create `supabase/README.md`**

```markdown
# TYREOS demo — Supabase backend

This directory holds the backend for the TYREOS working demo: database schema,
security policies, seed data, and (from Phase 2) Edge Functions.

## Layout

- `migrations/0001_init_schema.sql` — tables: services, clients, bookings, ai_usage
- `migrations/0002_rls_policies.sql` — RLS: anon read-only, no writes
- `seed.sql` — demo services, clients, bookings
- `functions/_shared/config.ts` — shop config (hours, bays, slot step, tz offset)
- `functions/_shared/availability.ts` — pure free-slot calculation (+ `.test.ts`)

## Run the availability tests (no external services needed)

```bash
node --test supabase/functions/_shared/
```

## Stand up the backend (done once, when ready to go live — start of Phase 2)

1. Create a new project at https://supabase.com (free tier). Note the project ref,
   the project URL, and the anon public key (Project Settings → API).
2. Install the Supabase CLI: https://supabase.com/docs/guides/cli and `supabase login`.
3. From the repo root, link the project: `supabase link --project-ref <PROJECT_REF>`.
4. Apply the schema and policies: `supabase db push` (applies `migrations/`).
5. Load seed data: run `supabase/seed.sql` in the SQL Editor (Dashboard) or
   `psql "<connection-string>" -f supabase/seed.sql`.
6. Set the Edge Function secrets (used from Phase 2):
   `supabase secrets set LLM_API_KEY=<deepseek-key> LLM_BASE_URL=https://api.deepseek.com LLM_MODEL=deepseek-chat`

The anon URL and key are public and belong in the frontend `config.js` (added in Phase 2).
The service-role key and `LLM_API_KEY` are secret — never commit them.
```

- [ ] **Step 2: Verify the README's test command actually works**

Run: `node --test supabase/functions/_shared/`
Expected: PASS (7 tests) — confirms the documented command is correct.

- [ ] **Step 3: Commit**

```bash
git add supabase/README.md
git commit -m "Add Supabase backend stand-up README (Phase 1 to 2 handoff)"
```

---

## Phase 1 done — what comes next

At the end of Phase 1 the repo contains a fully tested availability function and the
complete, reviewed SQL to stand up the backend. Phase 2 begins by having the user create
the Supabase project and apply this SQL (per `supabase/README.md`) — that is where the SQL
gets its live verification — then builds the `ai-chat` Edge Function on top of it.
