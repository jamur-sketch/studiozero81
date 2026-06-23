
-- App settings table for storing Google refresh token
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service role)
CREATE POLICY "Service role only" ON public.app_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id text,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  service text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Admins can manage bookings
CREATE POLICY "Admins can manage bookings" ON public.bookings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone authenticated can view bookings
CREATE POLICY "Authenticated users can view bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
