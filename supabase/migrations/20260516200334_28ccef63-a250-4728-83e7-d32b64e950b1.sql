CREATE OR REPLACE FUNCTION public.is_client_active(_whatsapp text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT active FROM public.profiles WHERE whatsapp = public.normalize_phone(_whatsapp) LIMIT 1),
    true
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_client_active(text) TO anon, authenticated;