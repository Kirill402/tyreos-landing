# TYREOS Working Demo — Design Spec

Date: 2026-07-06

## Purpose

Turn the existing static TYREOS landing page into a **working portfolio demo**: behind
the "Попробовать бесплатно" CTA there is now a real, functioning product for a single
fictional tire shop. A visitor can chat in free text with an AI administrator that
actually books an appointment into a live database, and a demo owner panel shows those
bookings, client history (CRM), and an AI-generated analytics report.

This is a **portfolio piece**, not a commercial multi-tenant SaaS. There is one shop,
fake data, no real customers, and the data resets daily so visitors can play freely.

## Scope (v1)

Made genuinely functional in this version:
- **AI administrator chat + online booking** (client-facing) — the core of the demo.
- **Admin panel: bookings + CRM** (owner-facing) — list of bookings, client cards with
  history, mark booking done/cancelled.
- **AI Analyst** — a button in the admin that generates a short text report with
  recommendations from the real booking data.

## Non-goals (v1)

- No real messenger integrations (WhatsApp / Instagram / Messenger / Email). The landing
  advertises them; the product does not integrate them. Shown honestly.
- No real reminder sending (a booking may record a scheduled reminder row, but nothing
  is actually sent).
- No multi-tenant, no billing, no real authentication (demo panel is open, gated only by
  a "Войти как демо" button).
- No statistics charts — the AI Analyst covers insights as text instead.
- No streaming chat responses — replies return whole (non-streaming) in v1.
- No manual booking creation from the admin — bookings arrive via the AI chat; the admin
  can only change a booking's status (done/cancelled).

## Provider & model

- **LLM: DeepSeek** (chosen for lowest cost). OpenAI-compatible API at
  `https://api.deepseek.com`, model `deepseek-chat` (DeepSeek-V3, supports function
  calling — required for the booking tools).
- The endpoint, API key env-var name, and model name live in **Edge Function environment
  variables** (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`), so switching to OpenAI / another
  OpenAI-compatible provider (or back to Anthropic via an adapter) is a config change, not
  a code change.
- Secret name in Supabase: `LLM_API_KEY` (holds the DeepSeek key).
- Known risk: DeepSeek function-calling is slightly less reliable than Claude/GPT on
  multi-tool loops. Mitigation: explicit, minimal tool JSON schemas; a single re-prompt if
  the model fails to call a required tool; graceful fallback message otherwise.
- Data-locality note: DeepSeek is a third-party (Chinese) provider; requests leave to their
  servers. Acceptable because all demo data is fabricated.

## Architecture

Three layers, all on free tiers:

```
Browser (GitHub Pages)            Supabase                        DeepSeek
──────────────────────            ──────────────────────          ────────────
index.html  ──CTA──► booking.html
booking.html ─POST─► Edge Function: ai-chat ──────────────► deepseek-chat
  chat widget        │  tools: list_services,               (tool-use loop)
                     │  get_available_slots, create_booking
                     │  Postgres (RLS) ◄────────────────────┘
admin.html  ──read─► │  services / clients / bookings / ai_usage
  bookings/CRM       │
admin.html  ─POST──► Edge Function: ai-analyst ───────────► deepseek-chat (report)
                     │
(scheduled) ───────► Edge Function / pg_cron: demo-reset (daily reseed)
```

Rationale: GitHub Pages serves only static files and cannot hold secrets, so all LLM calls
and the API key live in **Supabase Edge Functions** (Deno/TypeScript). The browser never
sees the DeepSeek key or the Supabase service-role key.

## Frontend

Static HTML/CSS/JS, same visual system as the landing (SpaceX-style dark theme).

- **`index.html` (existing landing)** — kept frozen except the three CTA links (header,
  hero primary, final CTA) now point to `booking.html` instead of `#final-cta`/`mailto:`.
  A discreet "Демо-админка" link is added to the footer pointing to `admin.html` so
  portfolio viewers can find the owner panel.
- **`booking.html`** — client-facing: a short service menu (from the DB) plus a chat
  widget talking to the `ai-chat` Edge Function. Free-text conversation; the AI proposes
  slots and confirms a real booking.
- **`admin.html`** — owner panel behind a "Войти как демо" button (sets a localStorage
  flag, reveals the panel — no real auth). Sections: **Записи** (table, filter by day and
  status, mark done/cancelled), **Клиенты** (CRM cards with per-client booking history),
  **AI-Аналитик** (button → `ai-analyst` → rendered markdown report).
- **`app.css`** — styles for `booking.html` + `admin.html`. Contains its own copy of the
  `:root` design tokens (≈20 lines, a conscious small duplication of the landing's tokens
  to keep the shipped landing's `styles.css` frozen and regression-free). App-specific
  components (chat bubbles, tables, cards) live here.
- **`config.js`** — holds the public `SUPABASE_URL` and `SUPABASE_ANON_KEY` (both safe in
  client code). Loaded by `booking.html` and `admin.html`.
- **`app.js` / `booking.js` / `admin.js`** — page behavior: chat send/receive, session-id
  management (uuid in localStorage), booking table rendering, analyst report rendering.
  Kept as focused per-page files.

## Data model (Supabase Postgres)

- **`services`** — `id`, `name`, `duration_min`, `price`, `sort_order`.
  Seed: замена шин (R13–R16 / R17–R19 / R20–R22 as sizes affecting duration), ремонт
  прокола, балансировка, сезонное хранение.
- **`clients`** — `id`, `name`, `phone`, `notes`, `created_at`.
- **`bookings`** — `id`, `client_id` (fk), `service_id` (fk), `start_at` (timestamptz),
  `end_at` (timestamptz), `status` (`booked` | `done` | `cancelled`),
  `source` (`ai_chat` | `manual`), `created_at`.
- **`ai_usage`** — usage/rate-limit ledger: `id`, `session_id`, `kind` (`chat` | `analyst`),
  `created_at`. Used to enforce per-session and global-daily caps.

Shop configuration (working hours 09:00–21:00, `BAYS` = 2 concurrent posts, slot
granularity 30 min, timezone `Europe/Moscow`) is defined as **constants in a shared Edge
module** (`_shared/config.ts`), not a table — YAGNI for a single demo shop. All timestamps
stored in UTC, converted to the shop timezone for display and slot computation.

## Availability logic

A pure, deterministic function in `_shared/availability.ts`:
- Input: `serviceDurationMin`, `date` (a day), and the day's existing bookings.
- Generate candidate start times across working hours at 30-min granularity such that
  `start + duration` still falls within working hours.
- A candidate is **available** if the number of bookings overlapping
  `[start, start + duration)` is `< BAYS`.
- Output: list of available start times for that day.
- This is the single most logic-heavy unit and is unit-tested (TDD) against edge cases:
  fully booked day, partial overlaps at bay capacity, service longer than the remaining
  window, empty day, day at timezone boundary.

## Edge Functions (Deno/TypeScript)

1. **`ai-chat`** — body `{ sessionId, messages[] }`.
   - Enforce rate limits first (see below); if exceeded, return a friendly limit message.
   - Call DeepSeek chat completions with a Russian system prompt (role: администратор
     шиномонтажа TYREOS) and three tools:
     - `list_services()` → current services from DB.
     - `get_available_slots({ service_id, date })` → uses `availability.ts` over DB bookings.
     - `create_booking({ client_name, phone, service_id, start_at })` → upserts client by
       phone, inserts booking (`source = ai_chat`), returns confirmation with booking id.
   - Run the tool-use loop server-side (execute tool → feed result back → continue) until
     the model returns a final text reply; return that reply (and any created booking id).
   - Uses the **service-role** key to write, bypassing RLS. Client browsers cannot write
     bookings directly.

2. **`ai-analyst`** — body `{ sessionId }`.
   - Rate-limited. Reads aggregates (bookings per day, cancellations, top services, load vs
     capacity) and asks DeepSeek (no tools) for a short markdown report with 2–3
     recommendations for the owner. Returns the markdown.

3. **`demo-reset`** — scheduled daily (Supabase scheduled function / pg_cron) and callable
   manually. Truncates `clients`, `bookings`, `ai_usage` and re-runs the seed (services are
   static seed data; a fresh set of demo clients + bookings is regenerated relative to the
   current date so the admin and analyst always have believable, current data).

### Rate limiting (wallet protection — this is a public demo)

- **Per session:** cap chat calls per `session_id` (e.g. 25) and analyst calls (e.g. 5).
- **Global daily:** cap total DeepSeek calls per day (e.g. 500) as the real cost ceiling.
- On exceeding either, the Edge Function returns a friendly Russian message
  ("демо-лимит исчерпан, загляните позже") — never a raw error, never an uncapped spend.
- `session_id` is a client-generated uuid (soft throttle only); the global daily cap is the
  hard wallet guard.

## Security / RLS

- Anon key (public, in `config.js`): `SELECT` on `services`, `bookings`, `clients` for the
  admin read views; **no** direct `INSERT`/`UPDATE`/`DELETE` on `bookings`/`clients` from
  the browser.
- All writes (booking creation, status changes) go through Edge Functions using the
  service-role key. Booking status change from the admin uses a small dedicated Edge
  Function (`update-booking-status`) rather than opening an RLS write policy.
- DeepSeek key and service-role key exist only in Supabase secrets — never in git, never in
  client code.

## Error handling

- DeepSeek API error/timeout → chat shows "не получилось связаться с администратором,
  попробуйте ещё раз"; admin analyst shows a retry message.
- Model fails to call a required tool → one server-side re-prompt; then fallback message.
- `create_booking` slot conflict (taken meanwhile) → tool returns an error to the model so
  it offers another slot.
- Rate limit hit → friendly limit message (above).
- Supabase/network error → generic non-technical error surfaced to the user.

## Testing

- **Unit (TDD):** `availability.ts` pure function — the core logic, full edge-case coverage.
- **Integration:** Edge Function tool handlers against a locally seeded Supabase (or a test
  schema) — verify `create_booking` writes, `get_available_slots` reflects existing
  bookings, rate limits trigger.
- **Frontend:** verified via the browser preview tools (snapshot/inspect/console/network)
  as the landing was — plus one end-to-end manual check: chat a booking through, confirm it
  appears in the admin.

## Dependencies requiring user action (flagged)

- Create a new **Supabase project** (free tier); provide its `SUPABASE_URL` + anon key.
- Put the **DeepSeek key** into Supabase secrets as `LLM_API_KEY` (plus `LLM_BASE_URL`,
  `LLM_MODEL`).
- Supabase **CLI** login / access token for deploying Edge Functions and the schema
  (deployment needs the user's Supabase access).

## Hosting

- Frontend: GitHub Pages (existing setup, same repo).
- Backend: Supabase free tier (Postgres + Edge Functions + scheduled reset).

## Suggested build phases (for the implementation plan)

1. Supabase foundation: schema, RLS, seed, shop config, `availability.ts` (+ unit tests).
2. `ai-chat` Edge Function with the three tools and rate limiting.
3. `booking.html` frontend (service menu + chat widget) wired to `ai-chat`, end-to-end
   booking working.
4. `admin.html` (bookings + CRM + status change) reading live data.
5. `ai-analyst` Edge Function + admin report UI.
6. `demo-reset` scheduling + landing CTA rewiring + final QA.

Each phase produces a demonstrable, testable slice.
