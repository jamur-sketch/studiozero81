-- Agendamentos recorrentes de Quinta, Sexta e Sábado.
-- Gera 13 instâncias cada (hoje até ~3 meses).
-- Horários em America/Sao_Paulo (UTC-3).

-- ── Quinta-feira (a partir de 09/07) ─────────────────────────────────────────

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('João Felipe', '', 'Barba', '2026-07-09', '11:00', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'João Felipe', '', 'Barba', 35,
  ('2026-07-09T11:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-09T12:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Lucas Muniz GPS', '', 'Corte e barba', '2026-07-09', '16:00', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Lucas Muniz GPS', '', 'Corte e barba', 75,
  ('2026-07-09T16:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-09T17:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Tulio Collar', '', 'Corte', '2026-07-09', '17:15', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Tulio Collar', '', 'Corte', 50,
  ('2026-07-09T17:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-09T18:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Filipe Ferreira', '', 'Corte', '2026-07-09', '18:00', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Filipe Ferreira', '', 'Corte', 50,
  ('2026-07-09T18:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-09T18:45:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Tiago Mendes', '', 'Corte', '2026-07-09', '18:45', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Tiago Mendes', '', 'Corte', 50,
  ('2026-07-09T18:45:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-09T19:30:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Caua Mendes', '', 'Corte', '2026-07-09', '19:30', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Caua Mendes', '', 'Corte', 50,
  ('2026-07-09T19:30:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-09T20:30:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Tainan Silveira', '', 'Corte', '2026-07-09', '20:15', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Tainan Silveira', '', 'Corte', 50,
  ('2026-07-09T20:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-09T21:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

-- ── Sexta-feira (a partir de 10/07) ──────────────────────────────────────────

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('João Ramos', '', 'Corte e barba', '2026-07-10', '08:00', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'João Ramos', '', 'Corte e barba', 75,
  ('2026-07-10T08:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-10T09:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Maicon Ferreira', '', 'Barba', '2026-07-10', '10:15', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Maicon Ferreira', '', 'Barba', 35,
  ('2026-07-10T10:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-10T11:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Lucas', '', 'Barba', '2026-07-10', '14:00', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Lucas', '', 'Barba', 35,
  ('2026-07-10T14:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-10T15:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Bernardo', '', 'Corte', '2026-07-10', '15:00', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Bernardo', '', 'Corte', 50,
  ('2026-07-10T15:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-10T16:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Mateus Barcela', '', 'Corte e barba', '2026-07-10', '17:00', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Mateus Barcela', '', 'Corte e barba', 75,
  ('2026-07-10T17:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-10T18:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Gustavo Vieira', '', 'Corte', '2026-07-10', '18:45', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Gustavo Vieira', '', 'Corte', 50,
  ('2026-07-10T18:45:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-10T19:30:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

-- ── Sábado (a partir de 11/07) ────────────────────────────────────────────────

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Gilberto Melo', '5199896-6086', 'Corte e barba', '2026-07-11', '08:00', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Gilberto Melo', '5199896-6086', 'Corte e barba', 75,
  ('2026-07-11T08:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-11T09:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Romualdo', '', 'Barba', '2026-07-11', '09:00', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Romualdo', '', 'Barba', 35,
  ('2026-07-11T09:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-11T10:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Misael Alves', '', 'Corte', '2026-07-11', '11:45', true)
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT 'Misael Alves', '', 'Corte', 50,
  ('2026-07-11T11:45:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-11T12:30:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n ON CONFLICT DO NOTHING;
