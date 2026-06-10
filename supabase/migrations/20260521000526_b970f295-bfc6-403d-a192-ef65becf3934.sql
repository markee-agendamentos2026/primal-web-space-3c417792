-- 1) Drop global whatsapp uniqueness, add (tenant_id, whatsapp) unique
DROP INDEX IF EXISTS public.profiles_whatsapp_unique;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_tenant_whatsapp_unique
  ON public.profiles (tenant_id, whatsapp)
  WHERE whatsapp IS NOT NULL;

-- 2) cancel_booking: usar availability do tenant do booking (não mais id=1)
CREATE OR REPLACE FUNCTION public.cancel_booking(_id uuid, _whatsapp text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _rows int;
  _av record;
  _b record;
  _booking_ts timestamptz;
  _limit int;
BEGIN
  IF _wa IS NULL OR length(_wa) < 10 THEN
    RETURN false;
  END IF;

  SELECT * INTO _b FROM public.bookings
   WHERE id = _id AND whatsapp = _wa AND status IN ('pending','confirmed')
   LIMIT 1;
  IF _b IS NULL THEN
    RETURN false;
  END IF;

  SELECT cancel_min_lead_enabled, cancel_min_lead_min INTO _av
    FROM public.availability WHERE tenant_id = _b.tenant_id
    LIMIT 1;

  _limit := COALESCE(_av.cancel_min_lead_min, 0);

  IF COALESCE(_av.cancel_min_lead_enabled, true) AND _limit > 0 THEN
    _booking_ts := (_b.date::timestamp + _b.time) AT TIME ZONE 'America/Sao_Paulo';
    IF _booking_ts - now() < make_interval(mins => _limit) THEN
      RAISE EXCEPTION 'CANCEL_TOO_LATE';
    END IF;
  END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = _id;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$function$;