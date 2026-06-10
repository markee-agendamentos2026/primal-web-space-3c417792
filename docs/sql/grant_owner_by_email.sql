-- Concede role OWNER no Dom Amorim para um e-mail já existente em auth.users.
-- Troque SEU_EMAIL@exemplo.com e rode no SQL Editor do MAIN (oaygouigevynbsexxdzw).

DO $$
DECLARE
  _uid uuid;
  _tenant uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'SEU_EMAIL@exemplo.com' LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado em auth.users. Crie a conta antes (login ou BackOffice).';
  END IF;

  INSERT INTO public.profiles (id, name, email, active, tenant_id)
  VALUES (_uid, 'Dono', 'SEU_EMAIL@exemplo.com', true, _tenant)
  ON CONFLICT (id) DO UPDATE SET tenant_id = _tenant;

  DELETE FROM public.user_roles WHERE user_id = _uid AND role = 'owner'::app_role;
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (_uid, 'owner'::app_role, _tenant);
END $$;
