-- Patch Supabase DEVELOP: RPC tenant-aware + endurecimento parcial de RLS.
-- Rode no SQL Editor do projeto develop APÓS schema_public.sql.

-- 1) get_booking_by_id exige tenant quando informado
CREATE OR REPLACE FUNCTION public.get_booking_by_id(_id uuid, _tenant_id uuid DEFAULT NULL)
RETURNS SETOF public.bookings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT * FROM public.bookings
  WHERE id = _id
    AND (_tenant_id IS NULL OR tenant_id = _tenant_id)
  LIMIT 1;
$$;

-- 2) bookings INSERT: exige tenant_id válido
DROP POLICY IF EXISTS "anyone creates booking" ON public.bookings;
CREATE POLICY "anyone creates booking" ON public.bookings
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status <> 'blocked')
  );

-- 3) Leituras públicas: apenas linhas com tenant_id (app sempre filtra; reduz scan acidental)
DROP POLICY IF EXISTS "anyone reads services" ON public.services;
CREATE POLICY "anyone reads services" ON public.services
  FOR SELECT USING (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "anyone reads active pros" ON public.professionals;
CREATE POLICY "anyone reads active pros" ON public.professionals
  FOR SELECT USING (active = true AND tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "anyone reads availability" ON public.availability;
CREATE POLICY "anyone reads availability" ON public.availability
  FOR SELECT USING (tenant_id IS NOT NULL);

-- NOTA: isolamento total em SELECT ainda depende de .eq('tenant_id') no client.
-- Próximo passo SaaS: RPCs SECURITY DEFINER ou JWT claim com tenant_id.
