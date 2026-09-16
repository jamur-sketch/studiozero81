-- ============================================================
-- AVISO DE CANCELAMENTO
-- Até aqui o admin só era avisado de agendamento novo. Se o cliente
-- cancelasse, ninguém ficava sabendo — e o horário aparecia ocupado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_cancelled_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só interessa a transição para cancelado.
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Bloqueio de agenda não é cancelamento de cliente.
  IF NEW.status = 'blocked' OR OLD.status = 'blocked' THEN
    RETURN NEW;
  END IF;

  -- Sem usuário logado = manutenção via SQL Editor. Não avisa.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cancelamento feito pelo próprio admin não precisa avisar o admin.
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (type, title, body, booking_id)
  VALUES (
    'booking_cancelled',
    NEW.client_name || ' cancelou ' || NEW.service,
    'Era ' || to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') ||
      ' às ' || to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') ||
      ' — o horário está livre de novo.',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_cancelled_booking ON public.bookings;
CREATE TRIGGER trg_notify_cancelled_booking
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_cancelled_booking();
