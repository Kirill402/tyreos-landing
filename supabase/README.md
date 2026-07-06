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
node --test supabase/functions/_shared/*.test.ts
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
