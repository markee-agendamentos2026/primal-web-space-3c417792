
-- ============ app_settings (global) ============
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS uazapi_base_url text,
  ADD COLUMN IF NOT EXISTS uazapi_token text,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_from_name text NOT NULL DEFAULT 'Markee',
  ADD COLUMN IF NOT EXISTS email_from_local text NOT NULL DEFAULT 'contato',
  ADD COLUMN IF NOT EXISTS recurrence_min_interval_seconds integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS recurrence_batch_size integer NOT NULL DEFAULT 50;

-- ============ tenants ============
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS whatsapp_sender_number text,
  ADD COLUMN IF NOT EXISTS email_reply_to text,
  ADD COLUMN IF NOT EXISTS whatsapp_instance text;

-- ============ Drop old recurrence_campaigns (replacing) ============
DROP TABLE IF EXISTS public.recurrence_campaigns CASCADE;

-- ============ recurrence_campaigns (new) ============
CREATE TABLE public.recurrence_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'manual', -- 'manual' | 'inactive_trigger'
  channels text[] NOT NULL DEFAULT ARRAY['email']::text[],
  audience_mode text NOT NULL DEFAULT 'all', -- 'all' | 'active' | 'inactive' | 'manual'
  inactive_days integer NOT NULL DEFAULT 20,
  message_body text NOT NULL DEFAULT '',
  email_subject text,
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind IN ('manual','inactive_trigger')),
  CHECK (audience_mode IN ('all','active','inactive','manual'))
);
CREATE INDEX idx_rec_campaigns_tenant ON public.recurrence_campaigns(tenant_id);
CREATE INDEX idx_rec_campaigns_kind_active ON public.recurrence_campaigns(kind, active);

ALTER TABLE public.recurrence_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages campaigns" ON public.recurrence_campaigns
  FOR ALL USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role))
  WITH CHECK (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));
CREATE POLICY "admin manages campaigns" ON public.recurrence_campaigns
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ recurrence_campaign_targets ============
CREATE TABLE public.recurrence_campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.recurrence_campaigns(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, profile_id)
);
CREATE INDEX idx_rec_targets_campaign ON public.recurrence_campaign_targets(campaign_id);

ALTER TABLE public.recurrence_campaign_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages targets" ON public.recurrence_campaign_targets
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.recurrence_campaigns c
    WHERE c.id = campaign_id
      AND public.user_has_tenant_role(auth.uid(), c.tenant_id, 'owner'::app_role)
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.recurrence_campaigns c
    WHERE c.id = campaign_id
      AND public.user_has_tenant_role(auth.uid(), c.tenant_id, 'owner'::app_role)
  ));
CREATE POLICY "admin manages targets" ON public.recurrence_campaign_targets
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ recurrence_queue ============
CREATE TABLE public.recurrence_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.recurrence_campaigns(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  channel text NOT NULL, -- 'whatsapp' | 'email'
  status text NOT NULL DEFAULT 'queued', -- 'queued' | 'sent' | 'failed' | 'skipped'
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  error text,
  payload_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (channel IN ('whatsapp','email')),
  CHECK (status IN ('queued','sent','failed','skipped'))
);
CREATE INDEX idx_rec_queue_status_sched ON public.recurrence_queue(status, scheduled_for);
CREATE INDEX idx_rec_queue_tenant ON public.recurrence_queue(tenant_id);
CREATE INDEX idx_rec_queue_campaign ON public.recurrence_queue(campaign_id);
-- Unique parcial: gatilho automático nunca duplica (campanha, cliente, canal)
CREATE UNIQUE INDEX uq_rec_queue_trigger_dedup ON public.recurrence_queue(campaign_id, profile_id, channel)
  WHERE status IN ('queued','sent');

ALTER TABLE public.recurrence_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads queue" ON public.recurrence_queue
  FOR SELECT USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));
CREATE POLICY "admin manages queue" ON public.recurrence_queue
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ recurrence_send_log ============
CREATE TABLE public.recurrence_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  campaign_id uuid,
  profile_id uuid,
  channel text NOT NULL,
  status text NOT NULL,
  recipient text,
  message_preview text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rec_log_tenant_created ON public.recurrence_send_log(tenant_id, created_at DESC);
CREATE INDEX idx_rec_log_campaign ON public.recurrence_send_log(campaign_id);

ALTER TABLE public.recurrence_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads log" ON public.recurrence_send_log
  FOR SELECT USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));
CREATE POLICY "admin manages log" ON public.recurrence_send_log
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ RPC: clientes elegíveis (inativos há X dias) ============
CREATE OR REPLACE FUNCTION public.recurrence_eligible_inactive_clients(_tenant_id uuid, _days integer)
RETURNS TABLE(profile_id uuid, name text, whatsapp text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.whatsapp, p.email
  FROM public.profiles p
  WHERE p.tenant_id = _tenant_id
    AND p.active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.tenant_id = _tenant_id
        AND b.whatsapp = p.whatsapp
        AND b.status IN ('pending','confirmed','done')
        AND b.date >= (CURRENT_DATE - (_days || ' days')::interval)::date
    )
$$;

-- ============ Trigger: updated_at em recurrence_campaigns ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_rec_campaigns_touch
BEFORE UPDATE ON public.recurrence_campaigns
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
