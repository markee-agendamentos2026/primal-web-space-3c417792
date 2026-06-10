
-- 1) Hardening: revoke execute from anon nas funções criadas
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tenant_effective_status(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.refresh_all_tenant_statuses() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.confirm_payment(uuid, numeric, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_effective_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_all_tenant_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid, numeric, text, text, text) TO authenticated;

-- 2) Cria o usuário admin elias@gmail.com / teste@123 (idempotente)
DO $$
DECLARE
  _uid uuid;
  _t record;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'elias@gmail.com' LIMIT 1;

  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new
    ) VALUES (
      _uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'elias@gmail.com', crypt('teste@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Elias (Admin)"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), _uid,
            jsonb_build_object('sub', _uid::text, 'email', 'elias@gmail.com', 'email_verified', true),
            'email', _uid::text, now(), now(), now());
  ELSE
    -- garante senha conhecida mesmo se já existia
    UPDATE auth.users
      SET encrypted_password = crypt('teste@123', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE id = _uid;
  END IF;

  -- garante profile
  INSERT INTO public.profiles (id, name, email, active)
  VALUES (_uid, 'Elias (Admin)', 'elias@gmail.com', true)
  ON CONFLICT (id) DO NOTHING;

  -- vincula como admin em CADA tenant existente (admin é global, mas user_roles é por tenant)
  FOR _t IN SELECT id FROM public.tenants LOOP
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (_uid, 'admin'::app_role, _t.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
