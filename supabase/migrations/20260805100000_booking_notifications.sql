-- ============================================================
-- NOTIFICAÇÕES DE NOVO AGENDAMENTO
-- Quando um cliente agenda pelo portal, cria um aviso para o admin.
-- Agendamentos feitos pelo próprio admin não geram aviso.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'booking_created',
  title text NOT NULL,
  body text,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_created_at_idx
  ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Gatilho: cria o aviso automaticamente a cada agendamento de cliente.
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bloqueios de agenda não são agendamentos de cliente.
  IF NEW.status = 'blocked' THEN
    RETURN NEW;
  END IF;

  -- Sem usuário logado = seed/migração rodando no SQL Editor. Não avisa.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Agendamento criado pelo próprio admin não precisa avisar o admin.
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (type, title, body, booking_id)
  VALUES (
    'booking_created',
    NEW.client_name || ' agendou ' || NEW.service,
    to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') ||
      ' às ' || to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_booking ON public.bookings;
CREATE TRIGGER trg_notify_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_booking();

-- Habilita o envio em tempo real desta tabela para o app.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
