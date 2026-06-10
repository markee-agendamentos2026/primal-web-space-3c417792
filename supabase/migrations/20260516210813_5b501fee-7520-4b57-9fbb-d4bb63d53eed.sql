
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "service photos public read" ON storage.objects;
CREATE POLICY "service photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-photos');

DROP POLICY IF EXISTS "service photos owner insert" ON storage.objects;
CREATE POLICY "service photos owner insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-photos' AND public.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "service photos owner update" ON storage.objects;
CREATE POLICY "service photos owner update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-photos' AND public.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "service photos owner delete" ON storage.objects;
CREATE POLICY "service photos owner delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-photos' AND public.has_role(auth.uid(), 'owner'::public.app_role));
