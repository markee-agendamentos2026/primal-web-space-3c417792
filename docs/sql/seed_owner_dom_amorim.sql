-- Dono dedicado para teste local do painel Dom Amorim (Supabase MAIN).
-- Rode no SQL Editor: https://supabase.com/dashboard/project/oaygouigevynbsexxdzw/sql/new
-- Login: dono@dom-amorim.com / DomAmorim@123

DO $$
DECLARE
  _uid uuid;
  _tenant uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'dono@dom-amorim.com' LIMIT 1;

  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new
    ) VALUES (
      _uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'dono@dom-amorim.com', crypt('DomAmorim@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Dono Dom Amorim"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), _uid,
      jsonb_build_object('sub', _uid::text, 'email', 'dono@dom-amorim.com', 'email_verified', true),
      'email', _uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users
      SET encrypted_password = crypt('DomAmorim@123', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE id = _uid;
  END IF;

  INSERT INTO public.profiles (id, name, email, active, tenant_id)
  VALUES (_uid, 'Dono Dom Amorim', 'dono@dom-amorim.com', true, _tenant)
  ON CONFLICT (id) DO UPDATE SET tenant_id = _tenant, email = EXCLUDED.email;

  DELETE FROM public.user_roles WHERE user_id = _uid AND role = 'owner'::app_role;
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (_uid, 'owner'::app_role, _tenant);
END $$;
