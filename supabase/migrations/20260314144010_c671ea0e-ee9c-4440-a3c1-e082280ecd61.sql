
-- Subscription Plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  badge text NOT NULL DEFAULT 'Básico',
  price numeric(10,2) NOT NULL,
  cuts_per_month integer NOT NULL DEFAULT 0,
  beards_per_month integer NOT NULL DEFAULT 0,
  discount_percent integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE RESTRICT NOT NULL,
  start_date date NOT NULL,
  next_billing_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'active',
  credits_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default plans
INSERT INTO public.subscription_plans (name, badge, price, cuts_per_month, beards_per_month, discount_percent, is_featured) VALUES
  ('Plano Silver', 'Básico', 80.00, 2, 0, 10, false),
  ('Plano Gold', 'Popular', 120.00, 3, 1, 15, false),
  ('Plano VIP', 'Premium', 180.00, 4, 2, 20, true);
