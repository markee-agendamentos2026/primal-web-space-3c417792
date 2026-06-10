-- Corrige políticas de Storage para fotos do estabelecimento/profissionais/serviços.
-- A versão anterior consultava user_roles diretamente dentro da policy de storage.objects;
-- em alguns cenários isso pode falhar por RLS/visibilidade. Usamos as funções SECURITY DEFINER já existentes.

DROP POLICY IF EXISTS "service_photos_public_read" ON storage.objects;
CREATE POLICY "service_photos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'service-photos');

DROP POLICY IF EXISTS "service_photos_staff_write" ON storage.objects;
CREATE POLICY "service_photos_staff_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'service-photos'
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'owner'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "service_photos_staff_update" ON storage.objects;
CREATE POLICY "service_photos_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'service-photos'
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'owner'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::public.app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'service-photos'
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'owner'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "service_photos_staff_delete" ON storage.objects;
CREATE POLICY "service_photos_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'service-photos'
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'owner'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::public.app_role)
    )
  );