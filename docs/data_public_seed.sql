-- Seed mínimo para Supabase DEVELOP (sem auth.users / user_roles).
-- Use após schema_public.sql + storage_buckets.sql.
-- Para dump completo da cloud, use data_public.sql (veja DEVELOP-SUPABASE.md).

INSERT INTO public.tenants (id, slug, name, active, plan, primary_color, primary_glow_color, secondary_color, status, due_date, monthly_price, blocked_grace_days)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'dom-amorim', 'Barbearia Dom Amorim', true, 'basic', '#d4a64a', '#f0c674', '#0a0a0a', 'active', '2026-06-21', 99, 7),
  ('00000000-0000-0000-0000-000000000002', 'studio-nails', 'Studio Nails', true, 'basic', '#ec4899', '#f9a8d4', '#ffffff', 'active', '2026-06-21', 99, 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.availability (id, open_time, close_time, days_enabled, lunch_start, lunch_end, min_lead_min, max_future_days, require_pro_selection, business_name, lunch_enabled, min_lead_enabled, cancel_min_lead_enabled, cancel_min_lead_min, tenant_id)
VALUES
  (1, '08:00:00', '18:00:00', '{f,t,t,t,t,t,f}', '12:00:00', '13:30:00', 0, 60, true, 'Barbearia Dom Amorim', true, true, true, 60, '00000000-0000-0000-0000-000000000001'),
  (5, '08:00:00', '21:00:00', '{f,t,t,t,t,t,f}', '12:00:00', '13:30:00', 30, 60, true, 'Studio Nails', true, true, true, 60, '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Profissionais sem user_id (evita FK em auth.users)
INSERT INTO public.professionals (id, user_id, name, role, active, sort_order, tenant_id)
VALUES
  ('64707ae2-2aa7-4925-b8d0-5940809dc7b3', NULL, 'Ronielson', 'Barber', true, 1, '00000000-0000-0000-0000-000000000001'),
  ('58ca8674-abcc-4cc3-b02f-3d839fe4c14e', NULL, 'Elias sena', 'Mestre da navalha', true, 2, '00000000-0000-0000-0000-000000000001'),
  ('d7f29674-698a-4bd0-be34-83ed67374abd', NULL, 'Gaby sena', 'Unhas', true, 0, '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.services (id, name, duration_min, price, emoji, active, sort_order, tenant_id)
VALUES
  ('1464c98d-364f-4ffe-9425-f001ae313a8f', 'Corte Masculino', 45, 60.00, '✂️', true, 1, '00000000-0000-0000-0000-000000000001'),
  ('7a846743-272e-453b-af3f-f824ea6d5af6', 'Barba Completa', 30, 45.00, '🪒', true, 2, '00000000-0000-0000-0000-000000000001'),
  ('730c7ded-4724-4dc5-9a07-17c7bdca026a', 'Unha de gel', 60, 95.00, '✂️', true, 0, '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

SELECT pg_catalog.setval('public.availability_id_seq', 7, true);
