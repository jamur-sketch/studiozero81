-- ============================================================
-- REVISÃO DE SEGURANÇA
--
-- As regras de acesso do Postgres só conseguem olhar a linha
-- resultante, nunca comparar "antes × depois". Então elas deixam
-- o cliente editar campos que ele não deveria tocar, desde que a
-- linha continue sendo dele. Os testes mostraram que dava para:
--   · mudar o próprio cadastro para outra barbearia;
--   · zerar o preço do próprio atendimento;
--   · remarcar o horário para fora do expediente ou em cima de
--     outro cliente.
-- A trava precisa ser um gatilho, que enxerga os dois valores.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Cadastro de cliente: empresa e vínculo de login são imutáveis
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_client_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Sem usuário logado = manutenção pelo servidor; equipe da loja edita livre.
  IF auth.uid() IS NULL OR public.is_admin_of(OLD.barbershop_id) THEN
    RETURN NEW;
  END IF;

  NEW.barbershop_id := OLD.barbershop_id;
  NEW.user_id       := OLD.user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_client_update ON public.clients;
CREATE TRIGGER trg_guard_client_update
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_update();

-- ─────────────────────────────────────────────────────────────
-- 2. Agendamento: para o cliente, a única mudança é cancelar
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_booking_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_of(OLD.barbershop_id) THEN
    RETURN NEW;
  END IF;

  NEW.barbershop_id    := OLD.barbershop_id;
  NEW.client_id        := OLD.client_id;
  NEW.client_name      := OLD.client_name;
  NEW.client_phone     := OLD.client_phone;
  NEW.service          := OLD.service;
  NEW.price            := OLD.price;
  NEW.start_time       := OLD.start_time;
  NEW.end_time         := OLD.end_time;
  NEW.recurring        := OLD.recurring;
  NEW.recurrence_group := OLD.recurrence_group;
  NEW.payment_method   := OLD.payment_method;
  NEW.payment_status   := OLD.payment_status;

  -- Cancelar sim; "descancelar" ou qualquer outro estado, não.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_booking_update ON public.bookings;
CREATE TRIGGER trg_guard_booking_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_update();

-- Na criação, o cliente também não escolhe preço nem empresa:
-- o preço vem da tabela de serviços da loja.
CREATE OR REPLACE FUNCTION public.guard_booking_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  preco_tabela numeric;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_of(NEW.barbershop_id) THEN
    RETURN NEW;
  END IF;

  NEW.barbershop_id  := public.current_barbershop_id();
  NEW.payment_status := 'pending';
  NEW.payment_method := NULL;

  SELECT price INTO preco_tabela
  FROM public.services
  WHERE barbershop_id = NEW.barbershop_id AND lower(name) = lower(NEW.service) AND active
  LIMIT 1;

  IF preco_tabela IS NOT NULL THEN
    NEW.price := preco_tabela;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_booking_insert ON public.bookings;
CREATE TRIGGER trg_guard_booking_insert
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_insert();

-- ─────────────────────────────────────────────────────────────
-- 3. Horário fixo: mesma trava
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_recurring_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_of(OLD.barbershop_id) THEN
    RETURN NEW;
  END IF;

  NEW.barbershop_id := OLD.barbershop_id;
  NEW.client_id     := OLD.client_id;
  NEW.service       := OLD.service;
  NEW.start_date    := OLD.start_date;
  NEW.time          := OLD.time;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_recurring_update ON public.recurring_bookings;
CREATE TRIGGER trg_guard_recurring_update
  BEFORE UPDATE ON public.recurring_bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_recurring_update();
