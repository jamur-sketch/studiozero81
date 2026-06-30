-- Histórico de fechamento de caixa (um registro por dia).
CREATE TABLE IF NOT EXISTS public.cash_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_date date NOT NULL UNIQUE,
  total_received numeric(10,2) NOT NULL DEFAULT 0,
  total_cash numeric(10,2) NOT NULL DEFAULT 0,
  total_pix numeric(10,2) NOT NULL DEFAULT 0,
  total_credit numeric(10,2) NOT NULL DEFAULT 0,
  total_debit numeric(10,2) NOT NULL DEFAULT 0,
  total_owing numeric(10,2) NOT NULL DEFAULT 0,
  total_pending numeric(10,2) NOT NULL DEFAULT 0,
  appointments_count integer NOT NULL DEFAULT 0,
  closed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cash closures" ON public.cash_closures
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
