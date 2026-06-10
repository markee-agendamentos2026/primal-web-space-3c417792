-- Tabela de feature flags por empresa (admin libera, dono ativa)
CREATE TABLE public.tenant_features (
  tenant_id uuid NOT NULL,
  feature_key text NOT NULL,
  admin_enabled boolean NOT NULL DEFAULT false,
  owner_enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, feature_key)
);

ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

-- Leitura pública (efetiva é exposta por função)
CREATE POLICY "anyone reads tenant_features"
  ON public.tenant_features FOR SELECT
  USING (true);

-- Admin total
CREATE POLICY "admin manages tenant_features"
  ON public.tenant_features FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Dono não escreve direto (usa função SECURITY DEFINER abaixo)
-- (nenhuma policy de INSERT/UPDATE/DELETE para o dono)

CREATE TRIGGER tenant_features_touch
  BEFORE UPDATE ON public.tenant_features
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Função para o dono alternar owner_enabled (apenas se admin liberou)
CREATE OR REPLACE FUNCTION public.set_tenant_feature_owner(
  _tenant_id uuid,
  _feature_key text,
  _enabled boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _admin_enabled boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.user_has_tenant_role(_uid, _tenant_id, 'owner'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT admin_enabled INTO _admin_enabled
    FROM public.tenant_features
    WHERE tenant_id = _tenant_id AND feature_key = _feature_key;
  IF _admin_enabled IS NULL OR _admin_enabled = false THEN
    RAISE EXCEPTION 'feature_not_available';
  END IF;
  UPDATE public.tenant_features
    SET owner_enabled = _enabled
    WHERE tenant_id = _tenant_id AND feature_key = _feature_key;
  RETURN true;
END;
$$;

-- Função para admin alternar admin_enabled (faz upsert)
CREATE OR REPLACE FUNCTION public.set_tenant_feature_admin(
  _tenant_id uuid,
  _feature_key text,
  _enabled boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.tenant_features (tenant_id, feature_key, admin_enabled, owner_enabled)
  VALUES (_tenant_id, _feature_key, _enabled, false)
  ON CONFLICT (tenant_id, feature_key) DO UPDATE
    SET admin_enabled = EXCLUDED.admin_enabled,
        owner_enabled = CASE WHEN EXCLUDED.admin_enabled = false THEN false ELSE public.tenant_features.owner_enabled END;
  RETURN true;
END;
$$;

-- Função pública: features efetivas (admin AND owner) para o agendamento
CREATE OR REPLACE FUNCTION public.get_tenant_features_public(_tenant_id uuid)
RETURNS TABLE(feature_key text, enabled boolean, config jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT feature_key,
         (admin_enabled AND owner_enabled) AS enabled,
         config
  FROM public.tenant_features
  WHERE tenant_id = _tenant_id;
$$;