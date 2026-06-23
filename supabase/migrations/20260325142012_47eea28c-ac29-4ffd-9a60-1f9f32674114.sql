
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view services" ON public.services
  FOR SELECT TO authenticated
  USING (true);
