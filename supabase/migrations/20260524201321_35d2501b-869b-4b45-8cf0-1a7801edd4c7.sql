ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS uazapi_token text,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.uazapi_token IS 'Token UAZAPI específico desta empresa (definido pelo admin quando o plano com WhatsApp é contratado).';
COMMENT ON COLUMN public.tenants.whatsapp_enabled IS 'Ativa envio de WhatsApp para esta empresa. Requer uazapi_token preenchido.';
COMMENT ON COLUMN public.app_settings.uazapi_token IS 'DEPRECATED: o token agora é por empresa em tenants.uazapi_token.';
COMMENT ON COLUMN public.app_settings.whatsapp_enabled IS 'DEPRECATED: o toggle agora é por empresa em tenants.whatsapp_enabled.';