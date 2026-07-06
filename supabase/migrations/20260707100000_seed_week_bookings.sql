-- Agendamentos avulsos (não recorrentes):
-- Vitória está no migration anterior (20260707090000).
-- Aqui apenas Alisson (sáb 11/07, único não recorrente do sábado).

INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Alisson', '', 'Corte e barba', 75,
        '2026-07-11T10:00:00-03:00', '2026-07-11T11:15:00-03:00', 'confirmed', false)
ON CONFLICT DO NOTHING;
