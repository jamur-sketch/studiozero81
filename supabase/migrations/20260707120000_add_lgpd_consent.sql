-- Armazena o consentimento LGPD por cliente.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lgpd_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lgpd_consent_at timestamptz;
