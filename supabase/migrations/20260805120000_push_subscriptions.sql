-- ============================================================
-- NOTIFICAÇÕES PUSH (celular avisa mesmo com o app fechado)
-- Guarda a "inscrição" de cada aparelho que autorizou receber avisos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cada admin gerencia apenas os próprios aparelhos.
DROP POLICY IF EXISTS "Admins manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
