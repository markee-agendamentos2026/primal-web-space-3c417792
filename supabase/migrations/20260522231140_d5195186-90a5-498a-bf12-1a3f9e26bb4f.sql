
-- 1) Novo valor no enum app_role (precisa estar em migration separada do uso)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- 2) Novos campos em tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','late','blocked')),
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz,
  ADD COLUMN IF NOT EXISTS monthly_price numeric NOT NULL DEFAULT 99,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS blocked_grace_days int NOT NULL DEFAULT 7;

-- Seed inicial de vencimento para tenants existentes
UPDATE public.tenants
  SET due_date = COALESCE(due_date, (CURRENT_DATE + INTERVAL '30 days')::date)
  WHERE due_date IS NULL;

-- 3) Tabela payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'manual',
  reference text,
  provider text,
  provider_ref text,
  created_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id, paid_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4) Tabela audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_logs(tenant_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5) Security-definer helper: is_admin(uid)
-- (não usa o valor 'admin' diretamente — usa cast textual para evitar erro de enum em mesma transação)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'admin'
  )
$$;

-- 6) RLS — payments
DROP POLICY IF EXISTS "admin manages payments" ON public.payments;
CREATE POLICY "admin manages payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "owner reads own tenant payments" ON public.payments;
CREATE POLICY "owner reads own tenant payments" ON public.payments
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- 7) RLS — audit_logs
DROP POLICY IF EXISTS "admin manages audit" ON public.audit_logs;
CREATE POLICY "admin manages audit" ON public.audit_logs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 8) Admin pode escrever em tenants (além do owner)
DROP POLICY IF EXISTS "admin writes tenants" ON public.tenants;
CREATE POLICY "admin writes tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 9) Função: status efetivo
CREATE OR REPLACE FUNCTION public.tenant_effective_status(_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN t.status = 'blocked' THEN 'blocked'
      WHEN t.due_date IS NULL THEN 'active'
      WHEN CURRENT_DATE > t.due_date + (t.blocked_grace_days || ' days')::interval THEN 'blocked'
      WHEN CURRENT_DATE > t.due_date THEN 'late'
      ELSE 'active'
    END
  FROM public.tenants t WHERE t.id = _tenant_id
$$;

-- 10) Função: refresh em massa do status (usada on-read no admin)
CREATE OR REPLACE FUNCTION public.refresh_all_tenant_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants t
  SET status = CASE
    WHEN t.status = 'blocked' AND t.due_date IS NOT NULL
         AND CURRENT_DATE <= t.due_date THEN 'active'  -- pago e regularizado
    WHEN t.due_date IS NULL THEN t.status
    WHEN CURRENT_DATE > t.due_date + (t.blocked_grace_days || ' days')::interval THEN 'blocked'
    WHEN CURRENT_DATE > t.due_date THEN 'late'
    ELSE 'active'
  END
  WHERE t.due_date IS NOT NULL;
END;
$$;

-- 11) Função: confirmar pagamento (atômica + audit + extensão do due_date)
CREATE OR REPLACE FUNCTION public.confirm_payment(
  _tenant_id uuid,
  _amount numeric,
  _method text DEFAULT 'manual',
  _reference text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pid uuid;
  _new_due date;
  _uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.payments (tenant_id, amount, method, reference, notes, created_by)
  VALUES (_tenant_id, _amount, _method, _reference, _notes, _uid)
  RETURNING id INTO _pid;

  SELECT GREATEST(COALESCE(due_date, CURRENT_DATE), CURRENT_DATE) + INTERVAL '30 days'
    INTO _new_due
    FROM public.tenants WHERE id = _tenant_id;

  UPDATE public.tenants
    SET last_payment_at = now(),
        due_date = _new_due::date,
        status = 'active'
    WHERE id = _tenant_id;

  INSERT INTO public.audit_logs (actor_id, tenant_id, action, details)
  VALUES (_uid, _tenant_id, 'payment_confirmed',
          jsonb_build_object('payment_id', _pid, 'amount', _amount, 'method', _method));

  RETURN _pid;
END;
$$;
