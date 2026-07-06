-- Agendamentos avulsos da semana — Thu 09/07, Fri 10/07, Sat 11/07.
-- Ignorados: "Agenda bloqueada" e "Agenda fechada".
-- Serviços sem nome no título inferidos pela duração (60 min → Barba, 75 min → Corte e barba).
-- Horários em America/Sao_Paulo (UTC-3).

-- ── Quinta-feira, 09/07 ───────────────────────────────────────────────────────

-- João Felipe — Barba — 11:00–12:00
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('João Felipe', '', 'Barba', 35,
        '2026-07-09T11:00:00-03:00', '2026-07-09T12:00:00-03:00', 'confirmed', false);

-- Lucas Muniz GPS — Corte e Barba — 16:00–17:15
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Lucas Muniz GPS', '', 'Corte e barba', 75,
        '2026-07-09T16:00:00-03:00', '2026-07-09T17:15:00-03:00', 'confirmed', false);

-- Tulio Collar — Corte — 17:15–18:00
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Tulio Collar', '', 'Corte', 50,
        '2026-07-09T17:15:00-03:00', '2026-07-09T18:00:00-03:00', 'confirmed', false);

-- Filipe Ferreira — Corte — 18:00–18:45
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Filipe Ferreira', '', 'Corte', 50,
        '2026-07-09T18:00:00-03:00', '2026-07-09T18:45:00-03:00', 'confirmed', false);

-- Tiago Mendes — Corte — 18:45–19:30
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Tiago Mendes', '', 'Corte', 50,
        '2026-07-09T18:45:00-03:00', '2026-07-09T19:30:00-03:00', 'confirmed', false);

-- Caua Mendes — Corte — 19:30–20:30
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Caua Mendes', '', 'Corte', 50,
        '2026-07-09T19:30:00-03:00', '2026-07-09T20:30:00-03:00', 'confirmed', false);

-- Tainan Silveira — Corte — 20:15–21:00
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Tainan Silveira', '', 'Corte', 50,
        '2026-07-09T20:15:00-03:00', '2026-07-09T21:00:00-03:00', 'confirmed', false);

-- ── Sexta-feira, 10/07 ───────────────────────────────────────────────────────

-- João Ramos — Corte e Barba — 08:00–09:00
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('João Ramos', '', 'Corte e barba', 75,
        '2026-07-10T08:00:00-03:00', '2026-07-10T09:00:00-03:00', 'confirmed', false);

-- Maicon Ferreira — Barba — 10:15–11:15
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Maicon Ferreira', '', 'Barba', 35,
        '2026-07-10T10:15:00-03:00', '2026-07-10T11:15:00-03:00', 'confirmed', false);

-- Lucas — 14:00–15:00 (60 min → Barba)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Lucas', '', 'Barba', 35,
        '2026-07-10T14:00:00-03:00', '2026-07-10T15:00:00-03:00', 'confirmed', false);

-- Bernardo — Corte — 15:00–16:00
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Bernardo', '', 'Corte', 50,
        '2026-07-10T15:00:00-03:00', '2026-07-10T16:00:00-03:00', 'confirmed', false);

-- Mateus Barcela — Corte e Barba — 17:00–18:15
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Mateus Barcela', '', 'Corte e barba', 75,
        '2026-07-10T17:00:00-03:00', '2026-07-10T18:15:00-03:00', 'confirmed', false);

-- Gustavo Vieira — Corte — 18:45–19:30
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Gustavo Vieira', '', 'Corte', 50,
        '2026-07-10T18:45:00-03:00', '2026-07-10T19:30:00-03:00', 'confirmed', false);

-- ── Sábado, 11/07 ────────────────────────────────────────────────────────────
-- (Gilberto Melo sábado é recorrente — ver migration 20260707110000)

-- Romualdo — 09:00–10:00 (60 min → Barba)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Romualdo', '', 'Barba', 35,
        '2026-07-11T09:00:00-03:00', '2026-07-11T10:00:00-03:00', 'confirmed', false);

-- Alisson — 10:00–11:15 (75 min → Corte e barba)
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Alisson', '', 'Corte e barba', 75,
        '2026-07-11T10:00:00-03:00', '2026-07-11T11:15:00-03:00', 'confirmed', false);

-- Misael Alves — Corte — 11:45–12:30
INSERT INTO bookings (client_name, client_phone, service, price, start_time, end_time, status, recurring)
VALUES ('Misael Alves', '', 'Corte', 50,
        '2026-07-11T11:45:00-03:00', '2026-07-11T12:30:00-03:00', 'confirmed', false);
