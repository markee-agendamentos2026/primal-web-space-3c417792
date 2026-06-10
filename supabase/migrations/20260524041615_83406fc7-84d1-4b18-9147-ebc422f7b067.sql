
-- 1) Add global default grace days to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS default_blocked_grace_days integer NOT NULL DEFAULT 5;

-- ensure singleton row exists
INSERT INTO public.app_settings (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

-- 2) Trigger to auto-apply global grace days to new tenants
CREATE OR REPLACE FUNCTION public.tenants_apply_default_grace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _g integer;
BEGIN
  IF NEW.blocked_grace_days IS NULL OR NEW.blocked_grace_days = 5 THEN
    SELECT default_blocked_grace_days INTO _g FROM public.app_settings WHERE id = true;
    IF _g IS NOT NULL THEN
      NEW.blocked_grace_days := _g;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_default_grace ON public.tenants;
CREATE TRIGGER trg_tenants_default_grace
  BEFORE INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tenants_apply_default_grace();

-- 3) Admin RPC to review a receipt
CREATE OR REPLACE FUNCTION public.admin_review_receipt(
  _receipt_id uuid,
  _decision text,                 -- 'approve' | 'reject'
  _rejection_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _r record;
  _pid uuid;
BEGIN
  IF NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO _r FROM public.payment_receipts WHERE id = _receipt_id FOR UPDATE;
  IF _r IS NULL THEN RAISE EXCEPTION 'receipt_not_found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'already_reviewed'; END IF;

  IF _decision = 'approve' THEN
    _pid := public.confirm_payment(_r.tenant_id, _r.amount, 'pix', 'receipt:' || _r.id::text, _r.note);
    UPDATE public.payment_receipts
      SET status = 'approved', reviewed_by = _uid, reviewed_at = now(), payment_id = _pid
      WHERE id = _r.id;
    INSERT INTO public.audit_logs (actor_id, tenant_id, action, details)
      VALUES (_uid, _r.tenant_id, 'receipt_approved',
              jsonb_build_object('receipt_id', _r.id, 'payment_id', _pid, 'amount', _r.amount));
    RETURN _pid;
  ELSIF _decision = 'reject' THEN
    UPDATE public.payment_receipts
      SET status = 'rejected', reviewed_by = _uid, reviewed_at = now(),
          rejection_reason = COALESCE(_rejection_reason, 'Comprovante inválido')
      WHERE id = _r.id;
    INSERT INTO public.audit_logs (actor_id, tenant_id, action, details)
      VALUES (_uid, _r.tenant_id, 'receipt_rejected',
              jsonb_build_object('receipt_id', _r.id, 'reason', _rejection_reason));
    RETURN NULL;
  ELSE
    RAISE EXCEPTION 'invalid_decision';
  END IF;
END;
$$;
