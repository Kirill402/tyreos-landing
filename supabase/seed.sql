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
  (select id from services where name = 'Шиномонтаж R13–R16'),
  date_trunc('day', now()) - interval '1 day' + interval '9 hours',
  date_trunc('day', now()) - interval '1 day' + interval '9 hours 45 minutes',
  'done', 'ai_chat';

-- Today's booking (booked)
insert into bookings (client_id, service_id, start_at, end_at, status, source)
select
  (select id from clients where phone = '+79267654321'),
  (select id from services where name = 'Балансировка колёс'),
  date_trunc('day', now()) + interval '14 hours',
  date_trunc('day', now()) + interval '14 hours 40 minutes',
  'booked', 'manual';

-- Future booking (booked)
insert into bookings (client_id, service_id, start_at, end_at, status, source)
select
  (select id from clients where phone = '+79031112233'),
  (select id from services where name = 'Сезонное хранение шин'),
  date_trunc('day', now()) + interval '2 days' + interval '10 hours',
  date_trunc('day', now()) + interval '2 days' + interval '10 hours 20 minutes',
  'booked', 'manual';
