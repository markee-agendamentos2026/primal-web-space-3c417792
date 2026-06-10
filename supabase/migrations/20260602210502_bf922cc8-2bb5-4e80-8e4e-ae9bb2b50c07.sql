-- Markee leads (onboarding chamados)
CREATE SEQUENCE IF NOT EXISTS public.markee_ticket_seq START 1;

CREATE TABLE public.markee_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number text NOT NULL UNIQUE,
  business_name text NOT NULL,
  owner_name text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  segment text NOT NULL,
  segment_other text,
  about text,
  primary_color text,
  primary_glow_color text,
  secondary_color text,
  status text NOT NULL DEFAULT 'em_analise',
  notes text,
  created_tenant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_markee_leads_whatsapp ON public.markee_leads (whatsapp);
CREATE INDEX idx_markee_leads_status ON public.markee_leads (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.markee_leads TO authenticated;
GRANT ALL ON public.markee_leads TO service_role;

ALTER TABLE public.markee_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages markee_leads"
  ON public.markee_leads FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER markee_leads_touch
  BEFORE UPDATE ON public.markee_leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Eventos / log de mudanças de status
CREATE TABLE public.markee_lead_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.markee_leads(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_email text,
  from_status text,
  to_status text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_markee_lead_events_lead ON public.markee_lead_events (lead_id, created_at DESC);

GRANT SELECT, INSERT ON public.markee_lead_events TO authenticated;
GRANT ALL ON public.markee_lead_events TO service_role;

ALTER TABLE public.markee_lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages markee_lead_events"
  ON public.markee_lead_events FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- RPCs públicas (SECURITY DEFINER) — único caminho de acesso anon
-- ============================================================

-- Cria lead novo. Gera ticket MKE-000123.
CREATE OR REPLACE FUNCTION public.markee_create_lead(
  _business_name text,
  _owner_name text,
  _whatsapp text,
  _email text,
  _segment text,
  _segment_other text,
  _about text,
  _primary_color text,
  _primary_glow_color text,
  _secondary_color text
) RETURNS TABLE(id uuid, ticket_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _ticket text;
  _id uuid;
BEGIN
  IF _business_name IS NULL OR length(trim(_business_name)) < 2 THEN
    RAISE EXCEPTION 'business_name_invalid';
  END IF;
  IF _owner_name IS NULL OR length(trim(_owner_name)) < 2 THEN
    RAISE EXCEPTION 'owner_name_invalid';
  END IF;
  IF _wa IS NULL OR length(_wa) < 10 THEN
    RAISE EXCEPTION 'whatsapp_invalid';
  END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email_invalid';
  END IF;
  IF _about IS NOT NULL AND length(_about) > 500 THEN
    RAISE EXCEPTION 'about_too_long';
  END IF;

  _ticket := 'MKE-' || lpad(nextval('public.markee_ticket_seq')::text, 6, '0');

  INSERT INTO public.markee_leads (
    ticket_number, business_name, owner_name, whatsapp, email,
    segment, segment_other, about,
    primary_color, primary_glow_color, secondary_color
  ) VALUES (
    _ticket, trim(_business_name), trim(_owner_name), _wa, lower(trim(_email)),
    COALESCE(_segment, 'outros'), NULLIF(trim(COALESCE(_segment_other, '')), ''),
    NULLIF(trim(COALESCE(_about, '')), ''),
    _primary_color, _primary_glow_color, _secondary_color
  ) RETURNING markee_leads.id INTO _id;

  INSERT INTO public.markee_lead_events (lead_id, to_status, message)
    VALUES (_id, 'em_analise', 'Lead criado pelo onboarding público.');

  RETURN QUERY SELECT _id, _ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.markee_create_lead(text,text,text,text,text,text,text,text,text,text) TO anon, authenticated;

-- Consulta pública por ticket OU whatsapp (sem expor PII desnecessária).
CREATE OR REPLACE FUNCTION public.markee_get_lead_status(_ticket text, _whatsapp text)
RETURNS TABLE(
  ticket_number text,
  business_name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.ticket_number, l.business_name, l.status, l.created_at, l.updated_at
  FROM public.markee_leads l
  WHERE
    (_ticket IS NOT NULL AND length(trim(_ticket)) > 0 AND l.ticket_number = upper(trim(_ticket)))
    OR
    (_whatsapp IS NOT NULL AND length(public.normalize_phone(_whatsapp)) >= 10
       AND l.whatsapp = public.normalize_phone(_whatsapp))
  ORDER BY l.created_at DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.markee_get_lead_status(text,text) TO anon, authenticated;

-- Admin: atualiza status + registra evento
CREATE OR REPLACE FUNCTION public.markee_admin_update_status(
  _lead_id uuid,
  _new_status text,
  _message text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _old text;
BEGIN
  IF NOT public.is_admin(_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _new_status NOT IN ('em_analise','personalizando','pronto','ativo','rejeitado') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  SELECT status INTO _old FROM public.markee_leads WHERE id = _lead_id FOR UPDATE;
  IF _old IS NULL THEN RAISE EXCEPTION 'lead_not_found'; END IF;

  UPDATE public.markee_leads SET status = _new_status WHERE id = _lead_id;

  INSERT INTO public.markee_lead_events (lead_id, actor_id, from_status, to_status, message)
    VALUES (_lead_id, _uid, _old, _new_status, _message);

  INSERT INTO public.audit_logs (actor_id, action, details)
    VALUES (_uid, 'markee_lead_status_changed',
      jsonb_build_object('lead_id', _lead_id, 'from', _old, 'to', _new_status));

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.markee_admin_update_status(uuid,text,text) TO authenticated;