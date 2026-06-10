
ALTER TABLE public.availability DROP CONSTRAINT IF EXISTS singleton;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS primary_glow_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text;

UPDATE public.tenants
   SET primary_color      = '#d4a64a',
       primary_glow_color = '#f0c674',
       secondary_color    = '#0a0a0a'
 WHERE id = '00000000-0000-0000-0000-000000000001';

INSERT INTO public.tenants (id, slug, name, active, plan, primary_color, primary_glow_color, secondary_color)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'studio-nails',
  'Studio Nails',
  true,
  'basic',
  '#ec4899',
  '#f9a8d4',
  '#ffffff'
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      primary_color = EXCLUDED.primary_color,
      primary_glow_color = EXCLUDED.primary_glow_color,
      secondary_color = EXCLUDED.secondary_color;

INSERT INTO public.availability (tenant_id, business_name)
SELECT '00000000-0000-0000-0000-000000000002', 'Studio Nails'
WHERE NOT EXISTS (
  SELECT 1 FROM public.availability WHERE tenant_id = '00000000-0000-0000-0000-000000000002'
);
