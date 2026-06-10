ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

CREATE OR REPLACE FUNCTION public.tenant_effective_status(_tenant_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    CASE
      WHEN t.status = 'blocked' THEN 'blocked'
      WHEN t.trial_ends_at IS NOT NULL AND t.last_payment_at IS NULL AND now() <= t.trial_ends_at THEN 'trial'
      WHEN t.trial_ends_at IS NOT NULL AND t.last_payment_at IS NULL AND now() > t.trial_ends_at THEN 'blocked'
      WHEN t.due_date IS NULL THEN 'active'
      WHEN CURRENT_DATE > t.due_date + (t.blocked_grace_days || ' days')::interval THEN 'blocked'
      WHEN CURRENT_DATE > t.due_date THEN 'late'
      ELSE 'active'
    END
  FROM public.tenants t WHERE t.id = _tenant_id
$$;

DROP FUNCTION IF EXISTS public.tenant_financial_status(uuid);
CREATE FUNCTION public.tenant_financial_status(_tenant_id uuid)
RETURNS TABLE(
  tenant_id uuid, status text, effective_status text,
  due_date date, days_until_due integer, days_until_blocked integer,
  monthly_price numeric, last_payment_at timestamptz,
  has_pending_receipt boolean, has_rejected_receipt boolean,
  trial_ends_at timestamptz, trial_days_remaining integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id, t.status, public.tenant_effective_status(t.id),
    t.due_date,
    CASE WHEN t.due_date IS NULL THEN NULL ELSE (t.due_date - CURRENT_DATE) END,
    CASE WHEN t.due_date IS NULL THEN NULL
         WHEN CURRENT_DATE <= t.due_date THEN NULL
         ELSE GREATEST(0, (t.due_date + (t.blocked_grace_days || ' days')::interval)::date - CURRENT_DATE)
    END,
    t.monthly_price, t.last_payment_at,
    EXISTS (SELECT 1 FROM public.payment_receipts r WHERE r.tenant_id = t.id AND r.status = 'pending'),
    EXISTS (SELECT 1 FROM public.payment_receipts r
            WHERE r.tenant_id = t.id AND r.status = 'rejected'
              AND r.created_at > COALESCE(t.last_payment_at, t.created_at)),
    t.trial_ends_at,
    CASE
      WHEN t.trial_ends_at IS NULL OR t.last_payment_at IS NOT NULL THEN NULL
      ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (t.trial_ends_at - now())) / 86400.0))::int
    END
  FROM public.tenants t WHERE t.id = _tenant_id;
$$;

DROP FUNCTION IF EXISTS public.tenant_public_status(uuid);
CREATE FUNCTION public.tenant_public_status(_tenant_id uuid)
RETURNS TABLE(
  id uuid, name text, slug text, status text, effective_status text,
  due_date date, monthly_price numeric, owner_phone text, primary_color text,
  trial_ends_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id, t.name, t.slug, t.status,
    public.tenant_effective_status(t.id),
    t.due_date, t.monthly_price, t.owner_phone, t.primary_color,
    t.trial_ends_at
  FROM public.tenants t WHERE t.id = _tenant_id
$$;

CREATE OR REPLACE FUNCTION public.markee_convert_lead_to_tenant(
  _lead_id uuid,
  _slug text,
  _owner_user_id uuid,
  _monthly_price numeric DEFAULT 99,
  _trial_days integer DEFAULT 7
)
RETURNS TABLE(tenant_id uuid, slug text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _lead record;
  _tid uuid;
  _final_slug text;
  _try text;
  _i int := 0;
BEGIN
  IF NOT public.is_admin(_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO _lead FROM public.markee_leads WHERE id = _lead_id FOR UPDATE;
  IF _lead IS NULL THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF _lead.created_tenant_id IS NOT NULL THEN RAISE EXCEPTION 'lead_already_converted'; END IF;

  _final_slug := lower(regexp_replace(trim(_slug), '[^a-zA-Z0-9-]+', '-', 'g'));
  _final_slug := regexp_replace(_final_slug, '-+', '-', 'g');
  _final_slug := regexp_replace(_final_slug, '(^-|-$)', '', 'g');
  IF _final_slug IS NULL OR length(_final_slug) < 2 THEN RAISE EXCEPTION 'slug_invalid'; END IF;
  IF _final_slug = 'markee' THEN RAISE EXCEPTION 'slug_reserved'; END IF;

  _try := _final_slug;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = _try) LOOP
    _i := _i + 1;
    _try := _final_slug || '-' || _i::text;
    IF _i > 50 THEN RAISE EXCEPTION 'slug_collision'; END IF;
  END LOOP;
  _final_slug := _try;

  INSERT INTO public.tenants (
    name, slug, owner_name, owner_email, owner_phone,
    primary_color, primary_glow_color, secondary_color,
    monthly_price, status,
    trial_ends_at, due_date, last_payment_at,
    plan, active
  ) VALUES (
    _lead.business_name, _final_slug, _lead.owner_name, _lead.email, _lead.whatsapp,
    _lead.primary_color, _lead.primary_glow_color, _lead.secondary_color,
    COALESCE(_monthly_price, 99), 'active',
    now() + make_interval(days => COALESCE(_trial_days, 7)), NULL, NULL,
    'basic', true
  )
  RETURNING id INTO _tid;

  IF _owner_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (_owner_user_id, 'owner'::app_role, _tid)
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.markee_leads
    SET created_tenant_id = _tid, status = 'pronto'
    WHERE id = _lead_id;

  INSERT INTO public.markee_lead_events (lead_id, actor_id, from_status, to_status, message)
    VALUES (_lead_id, _uid, _lead.status, 'pronto',
            'Tenant criado: ' || _final_slug || ' (trial ' || COALESCE(_trial_days, 7) || ' dias).');

  INSERT INTO public.audit_logs (actor_id, tenant_id, action, details)
    VALUES (_uid, _tid, 'markee_lead_converted',
      jsonb_build_object('lead_id', _lead_id, 'slug', _final_slug, 'trial_days', _trial_days));

  RETURN QUERY SELECT _tid, _final_slug;
END;
$$;