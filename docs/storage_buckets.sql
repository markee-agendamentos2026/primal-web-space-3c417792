-- Cria o bucket de fotos de serviços (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true)
ON CONFLICT (id) DO NOTHING;
