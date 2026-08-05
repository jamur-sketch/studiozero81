-- Padroniza os bloqueios já existentes para o rótulo "Agenda bloqueada".
-- Bloqueios com motivo escrito pelo admin (ex: "Almoço") são preservados.

UPDATE public.bookings
SET service = 'Agenda bloqueada'
WHERE status = 'blocked'
  AND service IN ('Bloqueio', 'Bloqueado');

UPDATE public.bookings
SET client_name = 'Agenda bloqueada'
WHERE status = 'blocked'
  AND client_name = 'Bloqueado';
