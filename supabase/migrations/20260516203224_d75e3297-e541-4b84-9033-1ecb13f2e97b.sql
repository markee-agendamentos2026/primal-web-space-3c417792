
-- 1) Drop overly permissive policies on bookings
DROP POLICY IF EXISTS "public reads bookings" ON public.bookings;
DROP POLICY IF EXISTS "client cancels own booking" ON public.bookings;

-- 2) Lock down is_client_active (no anonymous enumeration)
REVOKE EXECUTE ON FUNCTION public.is_client_active(text) FROM anon, authenticated, public;

-- 3) SECURITY DEFINER RPCs for the anonymous booking flow
--    These expose only what each flow strictly needs.

-- 3a) Slot calculation: only time/duration/professional_id, never PII
CREATE OR REPLACE FUNCTION public.get_taken_slots(_date date, _professional_id uuid DEFAULT NULL)
RETURNS TABLE("time" time, duration_min int, professional_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.time, b.duration_min, b.professional_id
  FROM public.bookings b
  WHERE b.date = _date
    AND b.status IN ('pending','confirmed')
    AND (_professional_id IS NULL OR b.professional_id = _professional_id);
$$;
REVOKE ALL ON FUNCTION public.get_taken_slots(date, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_taken_slots(date, uuid) TO anon, authenticated;

-- 3b) Anonymous "my bookings" lookup scoped to caller-supplied whatsapp
CREATE OR REPLACE FUNCTION public.get_bookings_by_whatsapp(_whatsapp text)
RETURNS SETOF public.bookings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.bookings
  WHERE whatsapp = public.normalize_phone(_whatsapp)
    AND length(public.normalize_phone(_whatsapp)) >= 10
  ORDER BY date DESC, time DESC;
$$;
REVOKE ALL ON FUNCTION public.get_bookings_by_whatsapp(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_bookings_by_whatsapp(text) TO anon, authenticated;

-- 3c) Confirmation page: single booking by id (id is a random uuid, only known to creator)
CREATE OR REPLACE FUNCTION public.get_booking_by_id(_id uuid)
RETURNS public.bookings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.bookings WHERE id = _id;
$$;
REVOKE ALL ON FUNCTION public.get_booking_by_id(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_booking_by_id(uuid) TO anon, authenticated;

-- 3d) Cancel booking: requires matching whatsapp (proof of ownership for guest flow)
CREATE OR REPLACE FUNCTION public.cancel_booking(_id uuid, _whatsapp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _rows int;
BEGIN
  IF _wa IS NULL OR length(_wa) < 10 THEN
    RETURN false;
  END IF;
  UPDATE public.bookings
     SET status = 'cancelled'
   WHERE id = _id
     AND whatsapp = _wa
     AND status IN ('pending','confirmed');
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO anon, authenticated;

-- 4) Reviews: prevent duplicate/spam by enforcing one review per booking and
--    requiring the referenced booking to exist and be completed/confirmed.
DROP POLICY IF EXISTS "anyone creates review" ON public.reviews;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_id_unique
  ON public.reviews(booking_id)
  WHERE booking_id IS NOT NULL;

CREATE POLICY "review for existing booking"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    booking_id IS NOT NULL
    AND stars BETWEEN 1 AND 5
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status IN ('confirmed','done')
    )
  );
