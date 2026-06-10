ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_tenant_id_role_key;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_tenant_id_role_key UNIQUE (user_id, tenant_id, role);

DO $$
DECLARE
  _tenant uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  _uid uuid;
BEGIN
  SELECT id INTO _uid
  FROM auth.users
  WHERE lower(email) = lower('dombarber@gmail.com')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário dombarber@gmail.com não encontrado em auth.users';
  END IF;

  INSERT INTO public.profiles (id, name, email, tenant_id, active)
  VALUES (_uid, 'Dom barber', 'dombarber@gmail.com', _tenant, true)
  ON CONFLICT (id) DO UPDATE
    SET name = COALESCE(public.profiles.name, EXCLUDED.name),
        email = EXCLUDED.email,
        tenant_id = EXCLUDED.tenant_id,
        active = true;

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (_uid, 'owner'::public.app_role, _tenant)
  ON CONFLICT (user_id, tenant_id, role) DO NOTHING;
END $$;