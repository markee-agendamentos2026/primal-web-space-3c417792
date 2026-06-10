-- 1) Fix mutable search_path
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g') $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 2) Restrict SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.ensure_client_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_client_profile(text, text, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_taken_slots(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_taken_slots(date, uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_bookings_by_whatsapp(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bookings_by_whatsapp(text) TO anon, authenticated;

-- 3) Replace permissive RLS policy with validated check
DROP POLICY IF EXISTS "Anyone can insert onboarding requests" ON public.onboarding_requests;

CREATE POLICY "Public can submit onboarding with validation"
ON public.onboarding_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(full_name)) BETWEEN 2 AND 120
  AND length(trim(email)) BETWEEN 5 AND 255
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND (phone IS NULL OR length(phone) <= 32)
  AND (business_name IS NULL OR length(business_name) <= 160)
  AND (segment IS NULL OR length(segment) <= 120)
  AND status = 'pending'
);

-- 4) Realtime: remove bookings from public realtime publication if present, then gate realtime.messages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings';
  END IF;
END $$;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can receive realtime broadcasts" ON realtime.messages;
CREATE POLICY "Owners can receive realtime broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));