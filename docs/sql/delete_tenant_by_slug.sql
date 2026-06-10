-- Excluir empresa pelo slug (SQL Editor — projeto MAIN).
-- Substitua :slug ou use o bloco fixo para ronielsonhairsalon.

DO $$
DECLARE
  _slug text := 'ronielsonhairsalon';
  _tid uuid;
BEGIN
  SELECT id INTO _tid FROM public.tenants WHERE slug = _slug;
  IF _tid IS NULL THEN
    RAISE NOTICE 'Tenant % não encontrado', _slug;
    RETURN;
  END IF;

  DELETE FROM public.recurrence_send_log WHERE tenant_id = _tid;
  DELETE FROM public.recurrence_queue WHERE tenant_id = _tid;
  DELETE FROM public.recurrence_campaigns WHERE tenant_id = _tid;
  DELETE FROM public.payment_receipts WHERE tenant_id = _tid;
  DELETE FROM public.payments WHERE tenant_id = _tid;
  DELETE FROM public.waitlist WHERE tenant_id = _tid;
  DELETE FROM public.bookings WHERE tenant_id = _tid;
  DELETE FROM public.reviews WHERE tenant_id = _tid;
  DELETE FROM public.blocked_dates WHERE tenant_id = _tid;
  DELETE FROM public.services WHERE tenant_id = _tid;
  DELETE FROM public.professionals WHERE tenant_id = _tid;
  DELETE FROM public.availability WHERE tenant_id = _tid;
  DELETE FROM public.tenant_features WHERE tenant_id = _tid;
  DELETE FROM public.user_roles WHERE tenant_id = _tid;
  DELETE FROM public.profiles WHERE tenant_id = _tid;
  DELETE FROM public.tenants WHERE id = _tid;

  RAISE NOTICE 'Tenant % excluído (id %)', _slug, _tid;
END $$;
