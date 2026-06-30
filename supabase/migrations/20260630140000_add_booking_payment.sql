-- Controle de caixa: forma de pagamento e situação de pagamento dos agendamentos.
-- payment_status: 'pending' (ainda não pago), 'paid' (pago), 'owing' (ficou devendo)
-- payment_method: 'cash', 'pix', 'credit', 'debit' (null enquanto não pago)

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
