-- Gilberto Melo — Corte e Barba — Sábado recorrente 08:00–09:15.
-- Gera 13 instâncias (hoje até ~3 meses).

WITH rule AS (
  INSERT INTO recurring_bookings (client_name, client_phone, service, start_date, time, active)
  VALUES ('Gilberto Melo', '5199896-6086', 'Corte e barba', '2026-07-11', '08:00', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring, recurrence_group)
SELECT
  'Gilberto Melo', '5199896-6086', 'Corte e barba', 75,
  ('2026-07-11T08:00:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  ('2026-07-11T09:15:00-03:00'::timestamptz + (n * INTERVAL '7 days')),
  'confirmed', true, rule.id
FROM rule, generate_series(0, 12) AS n
ON CONFLICT DO NOTHING;
