
CREATE TABLE public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  date date NOT NULL,
  client_name text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  service_id uuid,
  service_name text,
  professional_id uuid,
  professional_name text,
  window_type text NOT NULL DEFAULT 'any', -- 'any' | 'range'
  window_start time,
  window_end time,
  notes text,
  status text NOT NULL DEFAULT 'waiting', -- 'waiting' | 'scheduled' | 'cancelled'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX waitlist_tenant_date_idx ON public.waitlist (tenant_id, date, status);

GRANT SELECT ON public.waitlist TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone creates waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "owner reads waitlist"
  ON public.waitlist FOR SELECT
  USING (user_has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "owner updates waitlist"
  ON public.waitlist FOR UPDATE
  USING (user_has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "owner deletes waitlist"
  ON public.waitlist FOR DELETE
  USING (user_has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));
