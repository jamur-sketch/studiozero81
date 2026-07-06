-- Remove planos existentes (se houver) e insere os planos padrão do Studio Zero81.
-- Usa upsert por nome para ser idempotente.

INSERT INTO subscription_plans (name, badge, price, cuts_per_month, beards_per_month, discount_percent, is_featured)
VALUES
  ('Corte e Barba', 'Completo', 219.90, 999, 999, 10, true),
  ('Corte',         'Corte',    129.90, 999,   0, 10, false),
  ('Barba',         'Barba',     99.90,   0, 999, 10, false)
ON CONFLICT DO NOTHING;
