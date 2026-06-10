
-- 1. Add description column to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description text;

-- 2. Phone normalization helper (digits only)
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g')
$$;

-- 3. Backfill normalized whatsapp in profiles and bookings
UPDATE public.profiles
   SET whatsapp = public.normalize_phone(whatsapp)
 WHERE whatsapp IS NOT NULL
   AND whatsapp <> public.normalize_phone(whatsapp);

UPDATE public.bookings
   SET whatsapp = public.normalize_phone(whatsapp)
 WHERE whatsapp IS NOT NULL
   AND whatsapp <> public.normalize_phone(whatsapp);

-- 4. Deduplicate profiles by whatsapp (keep oldest)
WITH ranked AS (
  SELECT id, whatsapp,
         ROW_NUMBER() OVER (PARTITION BY whatsapp ORDER BY created_at ASC) AS rn
    FROM public.profiles
   WHERE whatsapp IS NOT NULL
)
DELETE FROM public.profiles p
 USING ranked r
 WHERE p.id = r.id AND r.rn > 1;

-- 5. Unique index on normalized whatsapp
CREATE UNIQUE INDEX IF NOT EXISTS profiles_whatsapp_unique
  ON public.profiles (whatsapp)
  WHERE whatsapp IS NOT NULL;

-- 6. Ensure-client-profile function (SECURITY DEFINER) — never overwrites
CREATE OR REPLACE FUNCTION public.ensure_client_profile(_whatsapp text, _name text, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _id uuid;
BEGIN
  IF _wa IS NULL OR length(_wa) < 10 THEN
    RAISE EXCEPTION 'whatsapp invalido';
  END IF;

  SELECT id INTO _id FROM public.profiles WHERE whatsapp = _wa LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.profiles (id, name, email, whatsapp, active)
    VALUES (gen_random_uuid(), _name, _email, _wa, true)
    RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_client_profile(text, text, text) TO anon, authenticated;
