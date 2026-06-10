CREATE OR REPLACE FUNCTION public.get_waitlist_by_whatsapp(_whatsapp text, _tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid)
RETURNS SETOF public.waitlist
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.waitlist
   WHERE whatsapp = public.normalize_phone(_whatsapp)
     AND tenant_id = _tenant_id
     AND length(public.normalize_phone(_whatsapp)) >= 10
     AND status <> 'cancelled'
   ORDER BY date DESC, COALESCE(window_start, '00:00'::time) DESC;
$$;

CREATE OR REPLACE FUNCTION public.cancel_waitlist(_id uuid, _whatsapp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _rows int;
BEGIN
  IF _wa IS NULL OR length(_wa) < 10 THEN RETURN false; END IF;
  UPDATE public.waitlist
     SET status = 'cancelled'
   WHERE id = _id AND whatsapp = _wa AND status = 'waiting';
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_by_whatsapp(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_waitlist(uuid, text) TO anon, authenticated;