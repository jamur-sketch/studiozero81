-- ============================================================
-- MULTI-EMPRESA: separa os dados por barbearia
--
-- Até aqui toda regra de acesso perguntava apenas "é admin?".
-- Com mais de uma barbearia no sistema isso faria o dono de uma
-- enxergar os clientes e o faturamento da outra. Esta migração
-- passa a perguntar "é admin DESTA barbearia?".
--
-- É idempotente e preserva os dados existentes: tudo que já existe
-- é atribuído à primeira barbearia (Studio Zero81).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. As empresas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.barbershops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',      -- active | suspended | trial
  plan text NOT NULL DEFAULT 'trial',         -- trial | basic | pro
  owner_name text,
  owner_email text,
  phone text,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quem trabalha em qual barbearia, e com que papel.
-- Substitui o user_roles global, que não sabia a que empresa pertencia.
CREATE TABLE IF NOT EXISTS public.barbershop_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (barbershop_id, user_id)
);

CREATE INDEX IF NOT EXISTS barbershop_members_user_idx
  ON public.barbershop_members (user_id);

-- Donos da plataforma (você e os sócios). Enxergam números do negócio,
-- não os dados pessoais dos clientes de cada barbearia.
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. Funções de apoio
--    SECURITY DEFINER para poderem consultar as tabelas de
--    vínculo sem cair nas próprias regras de acesso (recursão).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_member_of(bid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbershop_members
    WHERE user_id = auth.uid() AND barbershop_id = bid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(bid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbershop_members
    WHERE user_id = auth.uid() AND barbershop_id = bid AND role = 'admin'
  );
$$;

-- A barbearia a que um cadastro de cliente pertence.
-- (current_barbershop_id vem adiante: depende da coluna criada no passo 4.)

-- ─────────────────────────────────────────────────────────────
-- 3. Cria a primeira barbearia e migra quem já é admin
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.barbershops (name, slug, status, plan, owner_email)
VALUES ('Studio Zero81', 'studio-zero81', 'active', 'pro', 'estudioo081@gmail.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.barbershop_members (barbershop_id, user_id, role)
SELECT b.id, ur.user_id, ur.role
FROM public.user_roles ur
CROSS JOIN (SELECT id FROM public.barbershops WHERE slug = 'studio-zero81') b
ON CONFLICT (barbershop_id, user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. Marca cada tabela com a barbearia dona (coluna + preenchimento)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  alvo text[] := ARRAY[
    'clients','bookings','services','app_settings','subscription_plans',
    'subscriptions','cash_closures','recurring_bookings','notifications'
  ];
  primeira uuid;
BEGIN
  SELECT id INTO primeira FROM public.barbershops WHERE slug = 'studio-zero81';

  FOREACH t IN ARRAY alvo LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE', t);

    -- Tudo que já existe pertence à primeira barbearia.
    EXECUTE format('UPDATE public.%I SET barbershop_id = $1 WHERE barbershop_id IS NULL', t)
      USING primeira;

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (barbershop_id)', t || '_barbershop_idx', t);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. Funções que dependem das colunas recém-criadas
-- ─────────────────────────────────────────────────────────────

-- A barbearia do usuário logado: pela equipe, ou pelo cadastro de cliente.
-- Usada como valor padrão nos inserts, para o código existente continuar
-- funcionando sem precisar informar a empresa em cada chamada.
CREATE OR REPLACE FUNCTION public.current_barbershop_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT barbershop_id FROM public.barbershop_members
      WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1),
    (SELECT barbershop_id FROM public.clients
      WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.client_barbershop_id(cid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT barbershop_id FROM public.clients WHERE id = cid;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Agora a coluna é obrigatória e se preenche sozinha
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  alvo text[] := ARRAY[
    'clients','bookings','services','app_settings','subscription_plans',
    'subscriptions','cash_closures','recurring_bookings','notifications'
  ];
BEGIN
  FOREACH t IN ARRAY alvo LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN barbershop_id SET DEFAULT public.current_barbershop_id()', t);
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN barbershop_id SET NOT NULL', t);
    -- Não depende de a proteção já estar ligada: sem isto, as regras
    -- abaixo seriam criadas mas simplesmente ignoradas pelo banco.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 7. Regras de acesso, agora por empresa
--
-- Antes de criar as novas, remove TODAS as regras existentes das
-- tabelas de negócio. Duas razões: a migração passa a poder rodar
-- de novo sem erro, e qualquer regra permissiva antiga — inclusive
-- criada à mão pelo painel — deixa de existir. Numa fronteira entre
-- empresas, uma regra esquecida é um vazamento.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  r record;
  alvo text[] := ARRAY[
    'clients','bookings','services','app_settings','subscription_plans',
    'subscriptions','cash_closures','recurring_bookings','notifications'
  ];
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(alvo)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- barbershops: a equipe vê a sua; o dono da plataforma vê todas.
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read own barbershop" ON public.barbershops;
CREATE POLICY "Members read own barbershop" ON public.barbershops
  FOR SELECT TO authenticated
  USING (public.is_member_of(id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins manage barbershops" ON public.barbershops;
CREATE POLICY "Platform admins manage barbershops" ON public.barbershops
  FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Barbershop admins update own" ON public.barbershops;
CREATE POLICY "Barbershop admins update own" ON public.barbershops
  FOR UPDATE TO authenticated
  USING (public.is_admin_of(id)) WITH CHECK (public.is_admin_of(id));

-- barbershop_members
ALTER TABLE public.barbershop_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own memberships" ON public.barbershop_members;
CREATE POLICY "Read own memberships" ON public.barbershop_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_of(barbershop_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "Admins manage own team" ON public.barbershop_members;
CREATE POLICY "Admins manage own team" ON public.barbershop_members
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id) OR public.is_platform_admin())
  WITH CHECK (public.is_admin_of(barbershop_id) OR public.is_platform_admin());

-- platform_admins: só a própria plataforma enxerga.
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform admins only" ON public.platform_admins;
CREATE POLICY "Platform admins only" ON public.platform_admins
  FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- clients

CREATE POLICY "Staff manage clients of their shop" ON public.clients
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id))
  WITH CHECK (public.is_admin_of(barbershop_id));

CREATE POLICY "Clients read own record" ON public.clients
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Clients create own record" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Clients update own record" ON public.clients
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- bookings

CREATE POLICY "Staff manage bookings of their shop" ON public.bookings
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id))
  WITH CHECK (public.is_admin_of(barbershop_id));

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

-- recurring_bookings

CREATE POLICY "Staff manage recurring of their shop" ON public.recurring_bookings
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id))
  WITH CHECK (public.is_admin_of(barbershop_id));

CREATE POLICY "Clients manage own recurring" ON public.recurring_bookings
  FOR ALL TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- services / subscription_plans: a equipe gerencia, o cliente da casa lê.

CREATE POLICY "Staff manage services of their shop" ON public.services
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id))
  WITH CHECK (public.is_admin_of(barbershop_id));

CREATE POLICY "Shop audience reads services" ON public.services
  FOR SELECT TO authenticated
  USING (barbershop_id = public.current_barbershop_id());


CREATE POLICY "Staff manage plans of their shop" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id))
  WITH CHECK (public.is_admin_of(barbershop_id));

CREATE POLICY "Shop audience reads plans" ON public.subscription_plans
  FOR SELECT TO authenticated
  USING (barbershop_id = public.current_barbershop_id());

-- subscriptions

CREATE POLICY "Staff manage subscriptions of their shop" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id))
  WITH CHECK (public.is_admin_of(barbershop_id));

CREATE POLICY "Clients view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients create own subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- cash_closures / app_settings / notifications: só a equipe da casa.
CREATE POLICY "Staff manage cash closures of their shop" ON public.cash_closures
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id))
  WITH CHECK (public.is_admin_of(barbershop_id));

CREATE POLICY "Staff manage settings of their shop" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id))
  WITH CHECK (public.is_admin_of(barbershop_id));

CREATE POLICY "Staff manage notifications of their shop" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_admin_of(barbershop_id))
  WITH CHECK (public.is_admin_of(barbershop_id));

-- ─────────────────────────────────────────────────────────────
-- 8. Pontos que ignoram as regras por design (SECURITY DEFINER)
--    Precisam filtrar a empresa na mão — as regras de acesso não
--    valem dentro deles.
-- ─────────────────────────────────────────────────────────────

-- Disponibilidade de horários: sem o filtro, o cliente de uma barbearia
-- via a agenda cheia de todas as outras.
CREATE OR REPLACE FUNCTION public.get_booked_slots(p_start timestamptz, p_end timestamptz)
RETURNS TABLE (start_time timestamptz, end_time timestamptz, recurrence_group text, status text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT b.start_time, b.end_time, b.recurrence_group::text, b.status
  FROM public.bookings b
  WHERE b.start_time >= p_start
    AND b.start_time <= p_end
    AND b.barbershop_id = public.current_barbershop_id();
$$;

REVOKE ALL ON FUNCTION public.get_booked_slots(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(timestamptz, timestamptz) TO authenticated;

-- Aparelhos que recebem push: sem a empresa, o dono de uma barbearia
-- receberia aviso dos agendamentos da outra.
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;

UPDATE public.push_subscriptions ps
SET barbershop_id = m.barbershop_id
FROM public.barbershop_members m
WHERE m.user_id = ps.user_id AND ps.barbershop_id IS NULL;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN barbershop_id SET DEFAULT public.current_barbershop_id();

CREATE INDEX IF NOT EXISTS push_subscriptions_barbershop_idx
  ON public.push_subscriptions (barbershop_id);

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='push_subscriptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.push_subscriptions', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own devices" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.is_member_of(barbershop_id));

-- Os avisos nascem já carimbados com a empresa do agendamento, em vez
-- de depender de quem está logado no momento do gatilho.
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'blocked' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin_of(NEW.barbershop_id) THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (type, title, body, booking_id, barbershop_id)
  VALUES (
    'booking_created',
    NEW.client_name || ' agendou ' || NEW.service,
    to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') ||
      ' às ' || to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    NEW.id,
    NEW.barbershop_id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_cancelled_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.status = 'blocked' OR OLD.status = 'blocked' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin_of(NEW.barbershop_id) THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (type, title, body, booking_id, barbershop_id)
  VALUES (
    'booking_cancelled',
    NEW.client_name || ' cancelou ' || NEW.service,
    'Era ' || to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') ||
      ' às ' || to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') ||
      ' — o horário está livre de novo.',
    NEW.id,
    NEW.barbershop_id
  );
  RETURN NEW;
END;
$$;
