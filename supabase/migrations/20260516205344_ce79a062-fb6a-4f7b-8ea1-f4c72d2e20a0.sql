
-- 1) Restore owner role for the two registered staff accounts (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'::app_role
FROM auth.users u
WHERE u.email IN ('elias@gmail.com','leandro@gmail.com')
ON CONFLICT DO NOTHING;

-- 2) Backfill profiles for every distinct whatsapp present in bookings,
--    preserving the first observed name/email and never overwriting existing profiles.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (public.normalize_phone(whatsapp))
           public.normalize_phone(whatsapp) AS wa,
           client_name,
           email
    FROM public.bookings
    WHERE public.normalize_phone(whatsapp) IS NOT NULL
      AND length(public.normalize_phone(whatsapp)) >= 10
    ORDER BY public.normalize_phone(whatsapp), created_at ASC
  LOOP
    PERFORM public.ensure_client_profile(r.wa, COALESCE(r.client_name, 'Cliente'), COALESCE(r.email, ''));
  END LOOP;
END $$;

-- 3) Safety-net trigger: every new booking guarantees a profile exists for its whatsapp
CREATE OR REPLACE FUNCTION public.bookings_ensure_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.whatsapp IS NOT NULL AND length(public.normalize_phone(NEW.whatsapp)) >= 10 THEN
    PERFORM public.ensure_client_profile(
      NEW.whatsapp,
      COALESCE(NEW.client_name, 'Cliente'),
      COALESCE(NEW.email, '')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_ensure_profile ON public.bookings;
CREATE TRIGGER trg_bookings_ensure_profile
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.bookings_ensure_profile();
