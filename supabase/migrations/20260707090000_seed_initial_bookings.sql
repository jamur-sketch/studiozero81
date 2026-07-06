-- Seed dos agendamentos iniciais importados do Google Calendar.
-- Recorrentes: Jacson (seg), Jamur (seg), Mateus (ter), Gilberto (qua).
-- Avulso: Vitória (qua 08/07).
-- Todos os horários em America/Sao_Paulo (UTC-3).

-- ── Jacson Rheinheimer — Barba e Contorno — Segunda 09:00–10:15 ──────────────
WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Jacson Rheinheimer', '', 'Barba e Contorno', '2026-07-06', '09:00', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT
  'Jacson Rheinheimer', '', 'Barba e Contorno', 0,
  ('2026-07-06T09:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-06T10:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n
ON CONFLICT DO NOTHING;

-- ── Jamur Barcelos — Corte e Barba — Segunda 18:00–19:15 ────────────────────
WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Jamur Barcelos', '51996147847', 'Corte e barba', '2026-07-06', '18:00', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT
  'Jamur Barcelos', '51996147847', 'Corte e barba', 75,
  ('2026-07-06T18:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-06T19:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n
ON CONFLICT DO NOTHING;

-- ── Mateus — Barba — Terça 09:00–10:00 ──────────────────────────────────────
WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Mateus', '', 'Barba', '2026-07-07', '09:00', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT
  'Mateus', '', 'Barba', 35,
  ('2026-07-07T09:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-07T10:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n
ON CONFLICT DO NOTHING;

-- ── Gilberto Mello — Barba — Quarta 08:00–09:00 ──────────────────────────────
WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Gilberto Mello', '5199896-6086', 'Barba', '2026-07-08', '08:00', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT
  'Gilberto Mello', '5199896-6086', 'Barba', 35,
  ('2026-07-08T08:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-08T09:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n
ON CONFLICT DO NOTHING;

-- ── Vitória — avulso — Quarta 08/07 18:00–19:00 ─────────────────────────────
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Vitória', '', 'Corte', 50, '2026-07-08T18:00:00-03:00', '2026-07-08T19:00:00-03:00', 'confirmed', false)
ON CONFLICT DO NOTHING;
