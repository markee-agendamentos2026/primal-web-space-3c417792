
-- FASE 1 — MULTI-TENANT FOUNDATION

-- 1) Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  plan text NOT NULL DEFAULT 'basic',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads tenants" ON public.tenants;
CREATE POLICY "anyone reads tenants" ON public.tenants FOR SELECT USING (true);
DROP POLICY IF EXISTS "owner writes tenants" ON public.tenants;
CREATE POLICY "owner writes tenants" ON public.tenants FOR ALL
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- 2) Dom Amorim (UUID fixo, usado como default em todas as colunas tenant_id)
INSERT INTO public.tenants (id, slug, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'dom-amorim', 'Barbearia Dom Amorim')
ON CONFLICT (id) DO NOTHING;

-- 3) tenant_id em todas as tabelas (NOT NULL com DEFAULT = Dom Amorim → backfill automático + compat)
ALTER TABLE public.availability         ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id);
ALTER TABLE public.professionals        ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id);
ALTER TABLE public.services             ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id);
ALTER TABLE public.bookings             ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id);
ALTER TABLE public.blocked_dates        ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id);
ALTER TABLE public.reviews              ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id);
ALTER TABLE public.recurrence_campaigns ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id);
ALTER TABLE public.profiles             ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_roles           ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id);

-- 4) Índices
CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_professionals_tenant ON public.professionals(tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date ON public.bookings(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_whatsapp ON public.profiles(tenant_id, whatsapp);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_tenant ON public.blocked_dates(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON public.reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_tenant ON public.recurrence_campaigns(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_tenant ON public.availability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON public.user_roles(tenant_id, user_id);

-- 5) availability.id: sequência ao invés de DEFAULT 1 (suporta múltiplos tenants)
CREATE SEQUENCE IF NOT EXISTS public.availability_id_seq OWNED BY public.availability.id;
SELECT setval('public.availability_id_seq', GREATEST(1, COALESCE((SELECT MAX(id) FROM public.availability), 1)));
ALTER TABLE public.availability ALTER COLUMN id SET DEFAULT nextval('public.availability_id_seq');

-- 6) Helper
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND tenant_id = _tenant_id)
$$;

-- 7) RPCs tenant-aware
DROP FUNCTION IF EXISTS public.get_taken_slots(date, uuid);
CREATE OR REPLACE FUNCTION public.get_taken_slots(
  _date date,
  _professional_id uuid DEFAULT NULL,
  _tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS TABLE("time" time without time zone, duration_min integer, professional_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.time, b.duration_min, b.professional_id
  FROM public.bookings b
  WHERE b.date = _date
    AND b.tenant_id = _tenant_id
    AND b.status IN ('pending','confirmed')
    AND (_professional_id IS NULL OR b.professional_id = _professional_id);
$$;

DROP FUNCTION IF EXISTS public.ensure_client_profile(text, text, text);
CREATE OR REPLACE FUNCTION public.ensure_client_profile(
  _whatsapp text, _name text, _email text,
  _tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _id uuid;
BEGIN
  IF _wa IS NULL OR length(_wa) < 10 THEN RAISE EXCEPTION 'whatsapp invalido'; END IF;
  SELECT id INTO _id FROM public.profiles WHERE whatsapp = _wa AND tenant_id = _tenant_id LIMIT 1;
  IF _id IS NULL THEN
    INSERT INTO public.profiles (id, name, email, whatsapp, active, tenant_id)
    VALUES (gen_random_uuid(), _name, _email, _wa, true, _tenant_id)
    RETURNING id INTO _id;
  END IF;
  RETURN _id;
END; $$;

DROP FUNCTION IF EXISTS public.get_bookings_by_whatsapp(text);
CREATE OR REPLACE FUNCTION public.get_bookings_by_whatsapp(
  _whatsapp text,
  _tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS SETOF bookings LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.bookings
   WHERE whatsapp = public.normalize_phone(_whatsapp)
     AND tenant_id = _tenant_id
     AND length(public.normalize_phone(_whatsapp)) >= 10
   ORDER BY date DESC, time DESC;
$$;

DROP FUNCTION IF EXISTS public.is_client_active(text);
CREATE OR REPLACE FUNCTION public.is_client_active(
  _whatsapp text,
  _tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT active FROM public.profiles WHERE whatsapp = public.normalize_phone(_whatsapp) AND tenant_id = _tenant_id LIMIT 1),
    true)
$$;

-- 8) Trigger passa tenant_id
CREATE OR REPLACE FUNCTION public.bookings_ensure_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.whatsapp IS NOT NULL AND length(public.normalize_phone(NEW.whatsapp)) >= 10 THEN
    PERFORM public.ensure_client_profile(
      NEW.whatsapp,
      COALESCE(NEW.client_name, 'Cliente'),
      COALESCE(NEW.email, ''),
      NEW.tenant_id
    );
  END IF;
  RETURN NEW;
END; $$;
