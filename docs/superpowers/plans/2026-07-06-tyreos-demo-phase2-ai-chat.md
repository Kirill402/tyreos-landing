# TYREOS Working Demo — Phase 2: AI-chat Edge Function

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `ai-chat` Supabase Edge Function — an AI administrator that talks to the client in free-text Russian and, via three tools (`list_services`, `get_available_slots`, `create_booking`), actually creates a booking in the database, with per-session and global-daily rate limits.

**Architecture:** Split the function into pure, Node-testable modules (date helpers, rate-limit decision, LLM request/response shaping, tool schemas + a repo-injected tool executor) and a thin impure Deno shell (`ai-chat/index.ts`) plus a Supabase adapter (`repo.ts`) that wire them to the live database and DeepSeek. The pure modules are built test-first with Node 24 (`node --test`); the impure shell is authored now and runtime-verified at deploy once the user stands up Supabase (mirrors Phase 1's authored-then-applied SQL).

**Tech Stack:** Deno (Supabase Edge Runtime), TypeScript, OpenAI-compatible DeepSeek chat API, `@supabase/supabase-js`, Node 24 test runner for the pure modules.

## Global Constraints

- LLM provider is DeepSeek via its OpenAI-compatible API. Endpoint, key, and model come from Edge Function env vars: `LLM_BASE_URL` (default `https://api.deepseek.com`), `LLM_API_KEY`, `LLM_MODEL` (default `deepseek-chat`). Never hardcode the key; never commit it.
- Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into Edge Functions automatically — the function uses the service-role client to read/write (bypassing RLS). The browser never gets the service-role key.
- Booking `status` values: `booked` | `done` | `cancelled`; `source`: `ai_chat` | `manual`. The function creates bookings with `source = 'ai_chat'`, `status = 'booked'`.
- Only `status = 'booked'` bookings occupy a bay for availability; cancelled/done do not block slots.
- Shop config (hours 09:00–21:00, bays 2, slot 30 min, MSK offset 180 min) is already in `supabase/functions/_shared/config.ts` — reuse it; do not redefine.
- Availability is computed by the existing pure `getAvailableSlots(dateStr, durationMin, bookings)` in `_shared/availability.ts` — reuse it; do not reimplement.
- Rate limits: per-session chat cap 25 turns/day, global cap 500 LLM calls/day. On exceed, return a friendly Russian message — never a raw error, never an uncapped spend.
- All copy shown to the user is Russian. All timestamps are UTC in the DB and in tool payloads (ISO-8601).
- Pure modules (`datetime.ts`, `ratelimit.ts`, `llm.ts`, `tools.ts`) must have NO Deno/Node-only globals and no impure imports, so `node --test` runs them and Deno imports them unchanged. The Supabase client and `fetch` to DeepSeek live only in `repo.ts` and `ai-chat/index.ts`.
- Node test command is the glob form: `node --test supabase/functions/_shared/*.test.ts` (bare-directory form does not recurse on Node 24/Windows).
- The landing site and all Phase 1 files (`config.ts`, `availability.ts`, `availability.test.ts`, the SQL) are frozen — do not modify them.
- Work on the existing `feature/working-demo` branch.

## Deferred verification (read before starting)

The impure shell — `repo.ts` (Supabase queries) and `ai-chat/index.ts` (Deno.serve, the DeepSeek fetch) — cannot be run locally: Deno and the Supabase CLI are not installed, and no live project/DeepSeek key exists yet. Those two files are authored and self-reviewed now, then runtime-verified at deploy (a curl smoke test in `supabase/README.md`, Task 6). Phase 2's verified-now deliverable is the four pure modules and their Node tests. Do NOT install Deno or a database to "fully test" the shell — that is the deploy step's job.

## File structure

```
supabase/functions/
  _shared/
    config.ts             (frozen — Phase 1)
    availability.ts       (frozen — Phase 1)
    availability.test.ts  (frozen — Phase 1)
    datetime.ts           -- Task 1: shop-local date helpers (pure)
    datetime.test.ts      -- Task 1
    ratelimit.ts          -- Task 2: rate-limit decision + constants (pure)
    ratelimit.test.ts     -- Task 2
    llm.ts                -- Task 3: OpenAI-compatible request build + response parse (pure)
    llm.test.ts           -- Task 3
    tools.ts              -- Task 4: tool schemas + BookingRepo interface + runTool (pure, repo-injected)
    tools.test.ts         -- Task 4
    repo.ts               -- Task 5: Supabase adapter implementing BookingRepo (impure)
    cors.ts               -- Task 6: shared CORS headers/handler
  ai-chat/
    index.ts              -- Task 6: Deno.serve handler (the tool-use loop)
```

---

### Task 1: Shop-local date helpers — TDD

**Files:**
- Create: `supabase/functions/_shared/datetime.ts`
- Test: `supabase/functions/_shared/datetime.test.ts`

**Interfaces:**
- Consumes: `SHOP_CONFIG` from `./config.ts`.
- Produces:
  - `shopLocalDateStr(now: Date): string` — the shop-local calendar date `'YYYY-MM-DD'` for a UTC instant.
  - `shopDayRangeUtc(dateStr: string): { fromUtc: Date; toUtc: Date }` — the UTC half-open range `[00:00 local, 24:00 local)` of a shop-local day; used to query the day's bookings.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/_shared/datetime.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test supabase/functions/_shared/datetime.test.ts`
Expected: FAIL — cannot resolve `./datetime.ts`.

- [ ] **Step 3: Implement `datetime.ts`**

```ts
import { SHOP_CONFIG } from './config.ts';

// Shop-local calendar date (YYYY-MM-DD) for a UTC instant. We shift the instant by the
// fixed offset and then read UTC fields, so the "wall clock" we read is the shop-local one.
export function shopLocalDateStr(now: Date): string {
  const local = new Date(now.getTime() + SHOP_CONFIG.utcOffsetMin * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// The UTC half-open range covering one shop-local day (00:00 local .. 24:00 local).
export function shopDayRangeUtc(dateStr: string): { fromUtc: Date; toUtc: Date } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const midnightLocalAsUtcMs = Date.UTC(y, m - 1, d, 0, 0);
  const fromUtc = new Date(midnightLocalAsUtcMs - SHOP_CONFIG.utcOffsetMin * 60_000);
  const toUtc = new Date(fromUtc.getTime() + 24 * 60 * 60_000);
  return { fromUtc, toUtc };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test supabase/functions/_shared/datetime.test.ts`
Expected: PASS — 3/3.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/datetime.ts supabase/functions/_shared/datetime.test.ts
git commit -m "Add shop-local date helpers with tests"
```

---

### Task 2: Rate-limit decision — TDD

**Files:**
- Create: `supabase/functions/_shared/ratelimit.ts`
- Test: `supabase/functions/_shared/ratelimit.test.ts`

**Interfaces:**
- Produces:
  - `RATE_LIMITS = { sessionChatMax: 25, globalDailyMax: 500 }`.
  - `interface RateLimitInput { sessionChatCount: number; globalDailyCount: number }`.
  - `interface RateLimitResult { allowed: boolean; reason?: 'global_daily' | 'session' }`.
  - `checkChatRateLimit(input: RateLimitInput): RateLimitResult` — global cap checked before session cap.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/_shared/ratelimit.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkChatRateLimit, RATE_LIMITS } from './ratelimit.ts';

test('allows a fresh session under both caps', () => {
  assert.deepEqual(checkChatRateLimit({ sessionChatCount: 0, globalDailyCount: 0 }), { allowed: true });
});

test('blocks when the session cap is reached', () => {
  const r = checkChatRateLimit({ sessionChatCount: RATE_LIMITS.sessionChatMax, globalDailyCount: 10 });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'session');
});

test('global cap takes precedence over the session cap', () => {
  const r = checkChatRateLimit({ sessionChatCount: RATE_LIMITS.sessionChatMax, globalDailyCount: RATE_LIMITS.globalDailyMax });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'global_daily');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test supabase/functions/_shared/ratelimit.test.ts`
Expected: FAIL — cannot resolve `./ratelimit.ts`.

- [ ] **Step 3: Implement `ratelimit.ts`**

```ts
export const RATE_LIMITS = {
  sessionChatMax: 25, // chat turns per session per day
  globalDailyMax: 500, // total LLM calls (chat + analyst) per day — the wallet ceiling
} as const;

export interface RateLimitInput {
  sessionChatCount: number;
  globalDailyCount: number;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'global_daily' | 'session';
}

export function checkChatRateLimit(input: RateLimitInput): RateLimitResult {
  if (input.globalDailyCount >= RATE_LIMITS.globalDailyMax) {
    return { allowed: false, reason: 'global_daily' };
  }
  if (input.sessionChatCount >= RATE_LIMITS.sessionChatMax) {
    return { allowed: false, reason: 'session' };
  }
  return { allowed: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test supabase/functions/_shared/ratelimit.test.ts`
Expected: PASS — 3/3.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/ratelimit.ts supabase/functions/_shared/ratelimit.test.ts
git commit -m "Add rate-limit decision function with tests"
```

---

### Task 3: LLM request/response shaping — TDD

**Files:**
- Create: `supabase/functions/_shared/llm.ts`
- Test: `supabase/functions/_shared/llm.test.ts`

**Interfaces:**
- Produces:
  - `interface ChatMessage { role: 'system'|'user'|'assistant'|'tool'; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }`.
  - `interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }`.
  - `interface ToolSchema { type: 'function'; function: { name: string; description: string; parameters: unknown } }`.
  - `buildChatRequest(model: string, messages: ChatMessage[], tools: ToolSchema[])` → OpenAI-compatible request body.
  - `interface ParsedAssistant { content: string | null; toolCalls: ToolCall[] }`.
  - `parseAssistantMessage(responseJson: unknown): ParsedAssistant` — tolerant of missing fields.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/_shared/llm.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChatRequest, parseAssistantMessage, type ChatMessage, type ToolSchema } from './llm.ts';

const tools: ToolSchema[] = [
  { type: 'function', function: { name: 'noop', description: 'x', parameters: { type: 'object', properties: {} } } },
];

test('buildChatRequest produces an OpenAI-compatible body', () => {
  const msgs: ChatMessage[] = [{ role: 'user', content: 'привет' }];
  const body = buildChatRequest('deepseek-chat', msgs, tools);
  assert.equal(body.model, 'deepseek-chat');
  assert.equal(body.tool_choice, 'auto');
  assert.deepEqual(body.messages, msgs);
  assert.equal(body.tools, tools);
});

test('parseAssistantMessage extracts plain content and empty toolCalls', () => {
  const parsed = parseAssistantMessage({ choices: [{ message: { content: 'здравствуйте' } }] });
  assert.equal(parsed.content, 'здравствуйте');
  assert.deepEqual(parsed.toolCalls, []);
});

test('parseAssistantMessage extracts tool_calls', () => {
  const parsed = parseAssistantMessage({
    choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'list_services', arguments: '{}' } }] } }],
  });
  assert.equal(parsed.content, null);
  assert.equal(parsed.toolCalls.length, 1);
  assert.equal(parsed.toolCalls[0].function.name, 'list_services');
});

test('parseAssistantMessage is tolerant of a malformed response', () => {
  const parsed = parseAssistantMessage({});
  assert.equal(parsed.content, null);
  assert.deepEqual(parsed.toolCalls, []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test supabase/functions/_shared/llm.test.ts`
Expected: FAIL — cannot resolve `./llm.ts`.

- [ ] **Step 3: Implement `llm.ts`**

```ts
export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolSchema {
  type: 'function';
  function: { name: string; description: string; parameters: unknown };
}

export function buildChatRequest(model: string, messages: ChatMessage[], tools: ToolSchema[]) {
  return {
    model,
    messages,
    tools,
    tool_choice: 'auto' as const,
    temperature: 0.3,
  };
}

export interface ParsedAssistant {
  content: string | null;
  toolCalls: ToolCall[];
}

export function parseAssistantMessage(responseJson: unknown): ParsedAssistant {
  const msg = (responseJson as any)?.choices?.[0]?.message ?? {};
  return {
    content: typeof msg.content === 'string' ? msg.content : null,
    toolCalls: Array.isArray(msg.tool_calls) ? (msg.tool_calls as ToolCall[]) : [],
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test supabase/functions/_shared/llm.test.ts`
Expected: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/llm.ts supabase/functions/_shared/llm.test.ts
git commit -m "Add LLM request/response shaping with tests"
```

---

### Task 4: Tool schemas + repo-injected executor — TDD

**Files:**
- Create: `supabase/functions/_shared/tools.ts`
- Test: `supabase/functions/_shared/tools.test.ts`

**Interfaces:**
- Consumes: `getAvailableSlots`, `BookingInterval` from `./availability.ts`; `shopDayRangeUtc`, `shopLocalDateStr` from `./datetime.ts`; `ToolSchema` from `./llm.ts`.
- Produces:
  - `interface ServiceRow { id: string; name: string; duration_min: number; price: number }`.
  - `interface BookingRepo` with `listServices()`, `getServiceById(id)`, `getBookingsForRange(fromUtc, toUtc)`, `upsertClientByPhone(name, phone)`, `createBooking({clientId, serviceId, startAt, endAt})`.
  - `TOOL_SCHEMAS: ToolSchema[]` — the three tool definitions.
  - `interface ToolResult { ok: boolean; data?: unknown; error?: string }`.
  - `runTool(name: string, argsJson: string, repo: BookingRepo): Promise<ToolResult>`.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/_shared/tools.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test supabase/functions/_shared/tools.test.ts`
Expected: FAIL — cannot resolve `./tools.ts`.

- [ ] **Step 3: Implement `tools.ts`**

```ts
import { getAvailableSlots, type BookingInterval } from './availability.ts';
import { shopDayRangeUtc, shopLocalDateStr } from './datetime.ts';
import type { ToolSchema } from './llm.ts';

export interface ServiceRow {
  id: string;
  name: string;
  duration_min: number;
  price: number;
}

export interface BookingRepo {
  listServices(): Promise<ServiceRow[]>;
  getServiceById(id: string): Promise<ServiceRow | null>;
  getBookingsForRange(fromUtc: Date, toUtc: Date): Promise<BookingInterval[]>;
  upsertClientByPhone(name: string, phone: string): Promise<string>;
  createBooking(input: { clientId: string; serviceId: string; startAt: Date; endAt: Date }): Promise<string>;
}

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'list_services',
      description: 'Вернуть список услуг шиномонтажа с ценами и длительностью.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description: 'Вернуть свободные слоты на выбранную дату для выбранной услуги.',
      parameters: {
        type: 'object',
        properties: {
          service_id: { type: 'string', description: 'id услуги из list_services' },
          date: { type: 'string', description: 'дата в формате YYYY-MM-DD' },
        },
        required: ['service_id', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description:
        'Создать запись клиента на слот. Вызывать только после того, как клиент подтвердил имя, телефон, услугу и время.',
      parameters: {
        type: 'object',
        properties: {
          client_name: { type: 'string' },
          phone: { type: 'string' },
          service_id: { type: 'string' },
          start_at: { type: 'string', description: 'ISO-8601 время начала (значение start_at из get_available_slots)' },
        },
        required: ['client_name', 'phone', 'service_id', 'start_at'],
      },
    },
  },
];

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export async function runTool(name: string, argsJson: string, repo: BookingRepo): Promise<ToolResult> {
  let args: any = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return { ok: false, error: 'invalid_arguments_json' };
  }

  switch (name) {
    case 'list_services': {
      const services = await repo.listServices();
      return {
        ok: true,
        data: services.map((s) => ({ id: s.id, name: s.name, duration_min: s.duration_min, price: s.price })),
      };
    }

    case 'get_available_slots': {
      const svc = await repo.getServiceById(String(args.service_id ?? ''));
      if (!svc) return { ok: false, error: 'service_not_found' };
      const { fromUtc, toUtc } = shopDayRangeUtc(String(args.date));
      const bookings = await repo.getBookingsForRange(fromUtc, toUtc);
      const slots = getAvailableSlots(String(args.date), svc.duration_min, bookings);
      return {
        ok: true,
        data: {
          date: args.date,
          service: svc.name,
          slots: slots.map((s) => ({ start_at: s.startAt.toISOString(), label: s.label })),
        },
      };
    }

    case 'create_booking': {
      const svc = await repo.getServiceById(String(args.service_id ?? ''));
      if (!svc) return { ok: false, error: 'service_not_found' };
      const startAt = new Date(String(args.start_at));
      if (isNaN(startAt.getTime())) return { ok: false, error: 'invalid_start_at' };
      const endAt = new Date(startAt.getTime() + svc.duration_min * 60_000);

      // Conflict re-check: confirm this exact slot is still free at booking time.
      const dateStr = shopLocalDateStr(startAt);
      const { fromUtc, toUtc } = shopDayRangeUtc(dateStr);
      const bookings = await repo.getBookingsForRange(fromUtc, toUtc);
      const stillFree = getAvailableSlots(dateStr, svc.duration_min, bookings).some(
        (s) => s.startAt.getTime() === startAt.getTime(),
      );
      if (!stillFree) return { ok: false, error: 'slot_taken' };

      const clientId = await repo.upsertClientByPhone(String(args.client_name ?? ''), String(args.phone ?? ''));
      const bookingId = await repo.createBooking({ clientId, serviceId: svc.id, startAt, endAt });
      return { ok: true, data: { booking_id: bookingId, service: svc.name, start_at: startAt.toISOString() } };
    }

    default:
      return { ok: false, error: 'unknown_tool' };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test supabase/functions/_shared/tools.test.ts`
Expected: PASS — 6/6.

- [ ] **Step 5: Run the whole shared test suite to confirm no regressions**

Run: `node --test supabase/functions/_shared/*.test.ts`
Expected: PASS — all tests across availability/datetime/ratelimit/llm/tools green.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/tools.ts supabase/functions/_shared/tools.test.ts
git commit -m "Add tool schemas and repo-injected tool executor with tests"
```

---

### Task 5: Supabase repository adapter

**Files:**
- Create: `supabase/functions/_shared/repo.ts`

**Interfaces:**
- Consumes: `BookingRepo`, `ServiceRow` from `./tools.ts`; `BookingInterval` from `./availability.ts`.
- Produces: `createSupabaseRepo(sb: SupabaseClient): BookingRepo` — the live implementation. Impure (talks to Postgres); not Node-tested — verified at deploy.

- [ ] **Step 1: Create `repo.ts`**

```ts
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { BookingRepo, ServiceRow } from './tools.ts';
import type { BookingInterval } from './availability.ts';

// Live BookingRepo backed by Supabase, using the service-role client (bypasses RLS).
// Only 'booked' bookings occupy a bay, so availability queries filter on status='booked'.
export function createSupabaseRepo(sb: SupabaseClient): BookingRepo {
  return {
    async listServices(): Promise<ServiceRow[]> {
      const { data, error } = await sb.from('services').select('id,name,duration_min,price').order('sort_order');
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },

    async getServiceById(id: string): Promise<ServiceRow | null> {
      const { data, error } = await sb.from('services').select('id,name,duration_min,price').eq('id', id).maybeSingle();
      if (error) throw error;
      return (data as ServiceRow) ?? null;
    },

    async getBookingsForRange(fromUtc: Date, toUtc: Date): Promise<BookingInterval[]> {
      const { data, error } = await sb
        .from('bookings')
        .select('start_at,end_at')
        .eq('status', 'booked')
        .lt('start_at', toUtc.toISOString())
        .gt('end_at', fromUtc.toISOString());
      if (error) throw error;
      return (data ?? []).map((b: any) => ({ startAt: new Date(b.start_at), endAt: new Date(b.end_at) }));
    },

    async upsertClientByPhone(name: string, phone: string): Promise<string> {
      const { data: existing, error: selErr } = await sb.from('clients').select('id').eq('phone', phone).maybeSingle();
      if (selErr) throw selErr;
      if (existing) return (existing as any).id;
      const { data, error } = await sb.from('clients').insert({ name, phone }).select('id').single();
      if (error) throw error;
      return (data as any).id;
    },

    async createBooking(input): Promise<string> {
      const { data, error } = await sb
        .from('bookings')
        .insert({
          client_id: input.clientId,
          service_id: input.serviceId,
          start_at: input.startAt.toISOString(),
          end_at: input.endAt.toISOString(),
          status: 'booked',
          source: 'ai_chat',
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as any).id;
    },
  };
}
```

- [ ] **Step 2: Self-review against the adapter checklist**

(No local runtime — verify by reading.)
- Every method matches the `BookingRepo` interface in `tools.ts` (names, params, return types).
- `getBookingsForRange` filters `status = 'booked'` and uses the half-open overlap `start_at < toUtc && end_at > fromUtc`.
- `createBooking` writes `status: 'booked'`, `source: 'ai_chat'` and returns the new id.
- `upsertClientByPhone` returns the existing client's id when the phone already exists (dedupe), else inserts.
- Only `./tools.ts` and `./availability.ts` types plus the supabase-js type are imported — no landing/Phase-1 file modified.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/repo.ts
git commit -m "Add Supabase repository adapter for booking tools"
```

---

### Task 6: ai-chat Edge Function handler + CORS + deploy docs

**Files:**
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/ai-chat/index.ts`
- Modify: `supabase/README.md` (add the ai-chat deploy + curl smoke test)

**Interfaces:**
- Consumes: `createSupabaseRepo` (`./_shared/repo.ts`), `TOOL_SCHEMAS`/`runTool` (`./_shared/tools.ts`), `buildChatRequest`/`parseAssistantMessage`/`ChatMessage` (`./_shared/llm.ts`), `checkChatRateLimit` (`./_shared/ratelimit.ts`), `shopLocalDateStr` (`./_shared/datetime.ts`).
- Produces: the deployed `ai-chat` function. Request `{ sessionId: string, messages: ChatMessage[] }` → response `{ reply: string, bookingId?: string | null }`.

- [ ] **Step 1: Create `supabase/functions/_shared/cors.ts`**

```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Returns a preflight Response for OPTIONS, or null to continue.
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
```

- [ ] **Step 2: Create `supabase/functions/ai-chat/index.ts`**

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseRepo } from '../_shared/repo.ts';
import { TOOL_SCHEMAS, runTool } from '../_shared/tools.ts';
import { buildChatRequest, parseAssistantMessage, type ChatMessage } from '../_shared/llm.ts';
import { checkChatRateLimit } from '../_shared/ratelimit.ts';
import { shopLocalDateStr } from '../_shared/datetime.ts';

const MAX_TOOL_ROUNDS = 5;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function startOfUtcDayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function limitMessage(reason?: string): string {
  return reason === 'global_daily'
    ? 'Демо-лимит на сегодня исчерпан — загляните завтра, пожалуйста.'
    : 'Вы задали много вопросов в этой сессии. Обновите страницу, чтобы начать заново.';
}

function systemPrompt(todayStr: string): string {
  return [
    'Ты — вежливый администратор шиномонтажа TYREOS. Сегодня ' + todayStr + ' (часовой пояс МСК).',
    'Отвечай кратко, по-русски. Помоги клиенту записаться на услугу.',
    'Сначала пойми услугу: для шиномонтажа уточни диаметр колёс (например R17), чтобы выбрать нужную услугу.',
    'Используй инструменты: list_services — показать услуги; get_available_slots — свободное время; create_booking — создать запись.',
    'Вызывай create_booking только после того, как клиент подтвердил имя, телефон, услугу и конкретное время из предложенных слотов.',
    'Не выдумывай услуги, цены и свободное время — бери их только из инструментов.',
  ].join(' ');
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const body = await req.json().catch(() => null);
    const sessionId = body?.sessionId;
    const messages = body?.messages;
    if (typeof sessionId !== 'string' || !Array.isArray(messages)) {
      return json({ error: 'bad_request' }, 400);
    }

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const repo = createSupabaseRepo(sb);

    const since = startOfUtcDayIso();
    const [sessionRes, globalRes] = await Promise.all([
      sb.from('ai_usage').select('*', { count: 'exact', head: true }).eq('session_id', sessionId).eq('kind', 'chat').gte('created_at', since),
      sb.from('ai_usage').select('*', { count: 'exact', head: true }).gte('created_at', since),
    ]);
    const rl = checkChatRateLimit({ sessionChatCount: sessionRes.count ?? 0, globalDailyCount: globalRes.count ?? 0 });
    if (!rl.allowed) return json({ reply: limitMessage(rl.reason), bookingId: null });

    const apiKey = Deno.env.get('LLM_API_KEY')!;
    const baseUrl = Deno.env.get('LLM_BASE_URL') ?? 'https://api.deepseek.com';
    const model = Deno.env.get('LLM_MODEL') ?? 'deepseek-chat';

    const convo: ChatMessage[] = [
      { role: 'system', content: systemPrompt(shopLocalDateStr(new Date())) },
      ...(messages as ChatMessage[]),
    ];

    let createdBookingId: string | null = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(buildChatRequest(model, convo, TOOL_SCHEMAS)),
      });
      if (!res.ok) {
        return json({ reply: 'Не получилось связаться с администратором, попробуйте ещё раз.', bookingId: null });
      }
      const data = await res.json();
      const { content, toolCalls } = parseAssistantMessage(data);

      if (toolCalls.length === 0) {
        await sb.from('ai_usage').insert({ session_id: sessionId, kind: 'chat' });
        return json({ reply: content ?? '', bookingId: createdBookingId });
      }

      convo.push({ role: 'assistant', content: content ?? '', tool_calls: toolCalls });
      for (const tc of toolCalls) {
        const result = await runTool(tc.function.name, tc.function.arguments, repo);
        if (result.ok && tc.function.name === 'create_booking') {
          createdBookingId = (result.data as any).booking_id ?? createdBookingId;
        }
        convo.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    await sb.from('ai_usage').insert({ session_id: sessionId, kind: 'chat' });
    return json({ reply: 'Уточните, пожалуйста, услугу и удобное время — и я запишу вас.', bookingId: createdBookingId });
  } catch (_e) {
    return json({ reply: 'Произошла ошибка. Попробуйте ещё раз.', bookingId: null }, 200);
  }
});
```

- [ ] **Step 3: Self-review against the handler checklist**

- CORS preflight handled before anything else; all JSON responses include `corsHeaders`.
- Rate limit is checked BEFORE any DeepSeek call; on block it returns a friendly message and does NOT call the LLM.
- `ai_usage` is inserted once per completed turn (on the no-tool-calls return and on the max-rounds return), not per tool round.
- The tool-use loop is bounded by `MAX_TOOL_ROUNDS` (no infinite loop / runaway spend).
- Env vars: `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (auto-injected), `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL`. No secret is hardcoded.
- Any thrown error is caught and returned as a friendly Russian message (content always visible to the user).

- [ ] **Step 4: Append the ai-chat deploy + smoke test to `supabase/README.md`**

Add this section to the end of `supabase/README.md`:

```markdown
## Deploy the ai-chat Edge Function (Phase 2)

1. Ensure secrets are set (once):
   `supabase secrets set LLM_API_KEY=<deepseek-key> LLM_BASE_URL=https://api.deepseek.com LLM_MODEL=deepseek-chat`
   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)
2. Deploy: `supabase functions deploy ai-chat`
3. Smoke test (replace <PROJECT_REF> and <ANON_KEY>):
   ```bash
   curl -i -X POST "https://<PROJECT_REF>.functions.supabase.co/ai-chat" \
     -H "Authorization: Bearer <ANON_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"smoke-1","messages":[{"role":"user","content":"Привет! Какие есть услуги?"}]}'
   ```
   Expected: HTTP 200 with `{"reply":"...","bookingId":null}` where reply lists services (the model called list_services).
4. Booking test: continue the conversation asking to book a specific service/date/time and confirm a row appears in `bookings` with `source = 'ai_chat'`.
```

- [ ] **Step 5: Run the shared test suite once more (no regressions from Task 6)**

Run: `node --test supabase/functions/_shared/*.test.ts`
Expected: PASS — all pure-module tests still green (Task 6 added only impure files + docs).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/cors.ts supabase/functions/ai-chat/index.ts supabase/README.md
git commit -m "Add ai-chat Edge Function handler, CORS, and deploy docs"
```

---

## Phase 2 done — what comes next

After Phase 2 the repo contains the complete `ai-chat` function: pure modules fully unit-tested with Node, and the Deno/Supabase/DeepSeek shell authored and documented. The runtime verification (deploy + curl smoke test + a real booking landing in the DB) happens once the user has created the Supabase project and set the DeepSeek secret. Phase 3 builds `booking.html` — the client-facing chat UI that calls this function.
