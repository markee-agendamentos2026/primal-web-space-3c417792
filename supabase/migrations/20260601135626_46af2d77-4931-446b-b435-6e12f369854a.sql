-- 1) Ensure default tenant exists (profiles.tenant_id defaults to it via FK)
INSERT INTO public.tenants (id, name, slug, status, monthly_price, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Markee', 'markee', 'active', 0, true)
ON CONFLICT (id) DO NOTHING;

-- 2) Harden handle_new_user to never break signup if profile insert fails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, name, email, tenant_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      '00000000-0000-0000-0000-000000000001'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3) Create the bootstrap admin user elias@markee.com / Markee@123
DO $$
DECLARE
  _uid uuid;
  _tenant uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'elias@markee.com' LIMIT 1;

  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new
    ) VALUES (
      _uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'elias@markee.com', crypt('Markee@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Elias (Admin)"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), _uid,
      jsonb_build_object('sub', _uid::text, 'email', 'elias@markee.com', 'email_verified', true),
      'email', _uid::text, now(), now(), now()
    );
  ELSE
    UPDATE auth.users
      SET encrypted_password = crypt('Markee@123', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE id = _uid;
  END IF;

  INSERT INTO public.profiles (id, name, email, active, tenant_id)
  VALUES (_uid, 'Elias (Admin)', 'elias@markee.com', true, _tenant)
  ON CONFLICT (id) DO UPDATE SET tenant_id = _tenant, email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (_uid, 'admin'::app_role, _tenant)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
