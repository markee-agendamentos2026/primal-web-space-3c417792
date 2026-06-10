-- Execute no SQL Editor do Supabase DEVELOP após criar o usuário em Authentication.
-- Substitua YOUR_AUTH_USER_UUID pelo id do usuário (Authentication → Users).

INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES ('YOUR_AUTH_USER_UUID', 'admin', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role) DO NOTHING;

-- Dono da Barbearia Dom Amorim (painel /b/dom-amorim/painel):
-- INSERT INTO public.user_roles (user_id, role, tenant_id)
-- VALUES ('YOUR_AUTH_USER_UUID', 'owner', '00000000-0000-0000-0000-000000000001');
