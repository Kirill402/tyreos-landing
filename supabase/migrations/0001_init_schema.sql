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
