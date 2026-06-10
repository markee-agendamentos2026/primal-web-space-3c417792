
-- Status público do tenant (sem dados sensíveis), usado pela tela de bloqueio
CREATE OR REPLACE FUNCTION public.tenant_public_status(_tenant_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  status text,
  effective_status text,
  due_date date,
  monthly_price numeric,
  owner_phone text,
  primary_color text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id, t.name, t.slug,
    t.status,
    public.tenant_effective_status(t.id) AS effective_status,
    t.due_date, t.monthly_price, t.owner_phone, t.primary_color
  FROM public.tenants t
  WHERE t.id = _tenant_id
$$;

GRANT EXECUTE ON FUNCTION public.tenant_public_status(uuid) TO anon, authenticated;

-- Bloqueio real no backend: impede novos agendamentos
CREATE OR REPLACE FUNCTION public.bookings_block_when_tenant_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.tenant_effective_status(NEW.tenant_id) = 'blocked' THEN
    RAISE EXCEPTION 'TENANT_BLOCKED' USING HINT = 'Assinatura pendente. Regularize para voltar a utilizar a plataforma.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_block_when_tenant_blocked ON public.bookings;
CREATE TRIGGER trg_bookings_block_when_tenant_blocked
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_block_when_tenant_blocked();
