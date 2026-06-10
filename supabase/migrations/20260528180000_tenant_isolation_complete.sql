-- Isolamento multi-tenant completo (Supabase como única fonte de dados).
-- Idempotente: seguro rodar em MAIN/Lovable ou develop via `supabase db push` ou SQL Editor.

-- =============================================================================
-- 1) Helpers de papel por tenant
-- =============================================================================
CREATE OR REPLACE FUNCTION public.user_has_tenant_role(
  _user_id uuid,
  _tenant_id uuid,
  _role public.app_role
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_tenant_role(uuid, uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid, uuid) TO authenticated, anon;

-- =============================================================================
-- 2) user_roles: um papel por tenant (permite admin/owner em várias empresas)
-- =============================================================================
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_tenant_id_role_key;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_tenant_id_role_key UNIQUE (user_id, tenant_id, role);

-- =============================================================================
-- 3) blocked_dates: unicidade por tenant (não global)
-- =============================================================================
ALTER TABLE public.blocked_dates DROP CONSTRAINT IF EXISTS blocked_dates_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS blocked_dates_tenant_date_unique
  ON public.blocked_dates (tenant_id, date);

-- =============================================================================
-- 4) RPCs: sempre escopadas por tenant quando possível
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_booking_by_id(_id uuid, _tenant_id uuid DEFAULT NULL)
RETURNS SETOF public.bookings
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.bookings
  WHERE id = _id
    AND (_tenant_id IS NULL OR tenant_id = _tenant_id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_booking_by_id(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_booking_by_id(uuid, uuid) TO anon, authenticated;

-- =============================================================================
-- 5) INSERT público: exige tenant válido e ativo
-- =============================================================================
DROP POLICY IF EXISTS "anyone creates booking" ON public.bookings;
CREATE POLICY "anyone creates booking" ON public.bookings
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = tenant_id AND COALESCE(t.status, 'active') <> 'blocked'
    )
  );

DROP POLICY IF EXISTS "anyone creates waitlist" ON public.waitlist;
CREATE POLICY "anyone creates waitlist" ON public.waitlist
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = tenant_id AND COALESCE(t.status, 'active') <> 'blocked'
    )
  );

-- =============================================================================
-- 6) SELECT público: exige tenant_id (app filtra .eq; DB não retorna órfãos)
-- =============================================================================
DROP POLICY IF EXISTS "anyone reads services" ON public.services;
CREATE POLICY "anyone reads services" ON public.services
  FOR SELECT USING (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "anyone reads active pros" ON public.professionals;
CREATE POLICY "anyone reads active pros" ON public.professionals
  FOR SELECT USING (active = true AND tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "anyone reads availability" ON public.availability;
CREATE POLICY "anyone reads availability" ON public.availability
  FOR SELECT USING (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "anyone reads blocked" ON public.blocked_dates;
CREATE POLICY "anyone reads blocked" ON public.blocked_dates
  FOR SELECT USING (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "anyone reads reviews" ON public.reviews;
CREATE POLICY "anyone reads reviews" ON public.reviews
  FOR SELECT USING (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "anyone reads tenant_features" ON public.tenant_features;
CREATE POLICY "anyone reads tenant_features" ON public.tenant_features
  FOR SELECT USING (tenant_id IS NOT NULL);

-- tenants: slug público para resolver /b/:slug (sem dados sensíveis)
DROP POLICY IF EXISTS "anyone reads tenants" ON public.tenants;
CREATE POLICY "anyone reads tenants" ON public.tenants
  FOR SELECT USING (true);

-- =============================================================================
-- 7) Owner/professional: políticas por tenant (substitui has_role global)
-- =============================================================================
DROP POLICY IF EXISTS "owner writes tenants" ON public.tenants;
CREATE POLICY "owner writes tenants" ON public.tenants
  FOR ALL
  USING (public.user_has_tenant_role(auth.uid(), id, 'owner'))
  WITH CHECK (public.user_has_tenant_role(auth.uid(), id, 'owner'));

DROP POLICY IF EXISTS "owner writes availability" ON public.availability;
CREATE POLICY "owner writes availability" ON public.availability
  FOR ALL
  USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'))
  WITH CHECK (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "owner writes blocked" ON public.blocked_dates;
CREATE POLICY "owner writes blocked" ON public.blocked_dates
  FOR ALL
  USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'))
  WITH CHECK (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "owner writes pros" ON public.professionals;
CREATE POLICY "owner writes pros" ON public.professionals
  FOR ALL
  USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'))
  WITH CHECK (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "owner manages roles" ON public.user_roles;
CREATE POLICY "owner manages roles" ON public.user_roles
  FOR ALL
  USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'))
  WITH CHECK (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "owner reads all bookings" ON public.bookings;
CREATE POLICY "owner reads all bookings" ON public.bookings
  FOR SELECT
  USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "owner updates bookings" ON public.bookings;
CREATE POLICY "owner updates bookings" ON public.bookings
  FOR UPDATE
  USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "owner deletes bookings" ON public.bookings;
CREATE POLICY "owner deletes bookings" ON public.bookings
  FOR DELETE
  USING (public.user_has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "staff writes services" ON public.services;
CREATE POLICY "staff writes services" ON public.services
  FOR ALL
  USING (
    public.user_has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR public.user_has_tenant_role(auth.uid(), tenant_id, 'professional')
  )
  WITH CHECK (
    public.user_has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR public.user_has_tenant_role(auth.uid(), tenant_id, 'professional')
  );

-- =============================================================================
-- 8) Realtime (publicação) — ignora se já estiver na publication
-- =============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bookings','services','professionals','profiles','waitlist'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
