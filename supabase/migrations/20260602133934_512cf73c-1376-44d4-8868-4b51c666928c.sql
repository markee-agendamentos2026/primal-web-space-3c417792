-- Trigger de auditoria de alteração do número de WhatsApp do dono (remetente)
CREATE OR REPLACE FUNCTION public.tenants_audit_owner_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.owner_phone, '') IS DISTINCT FROM COALESCE(NEW.owner_phone, '') THEN
    INSERT INTO public.audit_logs (actor_id, tenant_id, action, details)
    VALUES (
      auth.uid(),
      NEW.id,
      'owner_phone_changed',
      jsonb_build_object(
        'old', OLD.owner_phone,
        'new', NEW.owner_phone,
        'source', CASE WHEN public.is_admin(auth.uid()) THEN 'backoffice' ELSE 'painel_dono' END
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_audit_owner_phone ON public.tenants;
CREATE TRIGGER trg_tenants_audit_owner_phone
AFTER UPDATE OF owner_phone ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.tenants_audit_owner_phone();