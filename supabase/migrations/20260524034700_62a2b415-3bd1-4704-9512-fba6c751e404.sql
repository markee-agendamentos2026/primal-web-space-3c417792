
-- 1) Singleton de configurações globais (chave PIX da Markee, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true,
  pix_key text,
  pix_key_type text, -- cpf|cnpj|email|phone|random
  pix_beneficiary_name text,
  pix_beneficiary_city text,
  pix_instructions text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT app_settings_singleton CHECK (id = true)
);

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads app_settings"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "admin writes app_settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2) Comprovantes de pagamento
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  payment_id uuid, -- preenchido após aprovação
  amount numeric NOT NULL,
  note text,
  file_url text NOT NULL,
  file_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_tenant ON public.payment_receipts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_status ON public.payment_receipts(status);

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own receipts"
  ON public.payment_receipts FOR SELECT TO authenticated
  USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "owner inserts own receipts"
  ON public.payment_receipts FOR INSERT TO authenticated
  WITH CHECK (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "admin manages receipts"
  ON public.payment_receipts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3) Padroniza prazo de bloqueio em 5 dias
ALTER TABLE public.tenants ALTER COLUMN blocked_grace_days SET DEFAULT 5;
UPDATE public.tenants SET blocked_grace_days = 5 WHERE blocked_grace_days <> 5;

-- 4) Bucket privado para comprovantes
INSERT INTO storage.buckets (id, name, public)
  VALUES ('payment-receipts', 'payment-receipts', false)
  ON CONFLICT (id) DO NOTHING;

-- Policies do bucket: estrutura de path = <tenant_id>/<filename>
DROP POLICY IF EXISTS "owner uploads receipt" ON storage.objects;
CREATE POLICY "owner uploads receipt"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND public.user_has_tenant_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'owner'::app_role)
  );

DROP POLICY IF EXISTS "owner reads own receipt" ON storage.objects;
CREATE POLICY "owner reads own receipt"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND public.user_has_tenant_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'owner'::app_role)
  );

DROP POLICY IF EXISTS "admin manages receipts files" ON storage.objects;
CREATE POLICY "admin manages receipts files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'payment-receipts' AND public.is_admin(auth.uid()));

-- 5) RPC: status financeiro detalhado (já temos tenant_effective_status, agregamos contagem regressiva)
CREATE OR REPLACE FUNCTION public.tenant_financial_status(_tenant_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  status text,            -- valor cru de tenants.status
  effective_status text,  -- active|late|blocked
  due_date date,
  days_until_due int,     -- positivo: faltam X dias; negativo: vencido há X dias
  days_until_blocked int, -- dias até bloquear (apenas em 'late'); null em outros
  monthly_price numeric,
  last_payment_at timestamptz,
  has_pending_receipt boolean,
  has_rejected_receipt boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id AS tenant_id,
    t.status,
    public.tenant_effective_status(t.id) AS effective_status,
    t.due_date,
    CASE WHEN t.due_date IS NULL THEN NULL
         ELSE (t.due_date - CURRENT_DATE) END AS days_until_due,
    CASE WHEN t.due_date IS NULL THEN NULL
         WHEN CURRENT_DATE <= t.due_date THEN NULL
         ELSE GREATEST(0, (t.due_date + (t.blocked_grace_days || ' days')::interval)::date - CURRENT_DATE)
    END AS days_until_blocked,
    t.monthly_price,
    t.last_payment_at,
    EXISTS (SELECT 1 FROM public.payment_receipts r
            WHERE r.tenant_id = t.id AND r.status = 'pending') AS has_pending_receipt,
    EXISTS (SELECT 1 FROM public.payment_receipts r
            WHERE r.tenant_id = t.id AND r.status = 'rejected'
              AND r.created_at > COALESCE(t.last_payment_at, t.created_at)) AS has_rejected_receipt
  FROM public.tenants t
  WHERE t.id = _tenant_id;
$$;
