-- ============================================================
-- ENDURECIMENTO DE SEGURANÇA (RLS)
-- Antes: qualquer usuário autenticado via TODOS os clientes,
-- agendamentos e assinaturas. Agora: cliente vê só o que é dele;
-- admin continua vendo tudo.
-- ============================================================

-- ── CLIENTS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

CREATE POLICY "Clients can view own record" ON public.clients
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own client record" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Clients can update own record" ON public.clients
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── BOOKINGS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.bookings;

CREATE POLICY "Clients view own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients create own bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients update own bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Disponibilidade de horários sem expor dados pessoais:
-- devolve apenas início/fim/grupo/status dos agendamentos do período.
CREATE OR REPLACE FUNCTION public.get_booked_slots(p_start timestamptz, p_end timestamptz)
RETURNS TABLE (start_time timestamptz, end_time timestamptz, recurrence_group text, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT b.start_time, b.end_time, b.recurrence_group::text, b.status
  FROM public.bookings b
  WHERE b.start_time >= p_start
    AND b.start_time <= p_end;
$$;

REVOKE ALL ON FUNCTION public.get_booked_slots(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(timestamptz, timestamptz) TO authenticated;

-- ── SUBSCRIPTIONS ────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view subscriptions" ON public.subscriptions;

CREATE POLICY "Clients view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients create own subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- ── RECURRING_BOOKINGS (criada via dashboard; versionando aqui) ──
ALTER TABLE public.recurring_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view recurring" ON public.recurring_bookings;
DROP POLICY IF EXISTS "Admins can manage recurring bookings" ON public.recurring_bookings;
DROP POLICY IF EXISTS "Clients view own recurring bookings" ON public.recurring_bookings;
DROP POLICY IF EXISTS "Clients create own recurring bookings" ON public.recurring_bookings;
DROP POLICY IF EXISTS "Clients update own recurring bookings" ON public.recurring_bookings;

CREATE POLICY "Admins can manage recurring bookings" ON public.recurring_bookings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients view own recurring bookings" ON public.recurring_bookings
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients create own recurring bookings" ON public.recurring_bookings
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients update own recurring bookings" ON public.recurring_bookings
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- ── APP_SETTINGS ─────────────────────────────────────────────
-- A tela de Configurações (admin) lê/grava shop_name e opening_hours
-- direto do navegador; a política antiga só permitia service_role.
CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
