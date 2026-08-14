-- ============================================================
-- DISPARO DO PUSH VIA SQL (alternativa ao Database Webhook)
-- Faz o banco chamar a função send-push a cada nova notificação.
-- A chave de serviço fica no cofre (Vault), nunca escrita no código.
-- ============================================================

-- Permite o banco fazer chamadas HTTP.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.send_push_for_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Sem configuração no cofre, apenas ignora: o aviso no sino continua funcionando.
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'send_push: project_url ou service_role_key ausente no cofre.';
    RETURN NEW;
  END IF;

  -- Assíncrono: não segura o agendamento esperando o envio.
  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_push_on_notification ON public.notifications;
CREATE TRIGGER trg_send_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.send_push_for_notification();
