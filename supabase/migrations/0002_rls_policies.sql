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
