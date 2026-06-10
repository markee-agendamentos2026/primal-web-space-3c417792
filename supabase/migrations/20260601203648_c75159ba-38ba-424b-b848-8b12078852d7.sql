
-- Storage RLS policies para uploads dos painéis (logos, fotos de profissionais/serviços e comprovantes)

-- SERVICE-PHOTOS (bucket público): leitura pública; escrita para qualquer usuário autenticado
-- que seja owner/professional em algum tenant, ou admin.
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
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('owner'::app_role, 'professional'::app_role)
      )
    )
  );

DROP POLICY IF EXISTS "service_photos_staff_update" ON storage.objects;
CREATE POLICY "service_photos_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'service-photos'
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('owner'::app_role, 'professional'::app_role)
      )
    )
  );

DROP POLICY IF EXISTS "service_photos_staff_delete" ON storage.objects;
CREATE POLICY "service_photos_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'service-photos'
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('owner'::app_role, 'professional'::app_role)
      )
    )
  );

-- PAYMENT-RECEIPTS (privado): path no formato "<tenant_id>/...".
-- Owner do tenant pode inserir/ler/atualizar/apagar; admin pode tudo.
DROP POLICY IF EXISTS "payment_receipts_owner_insert" ON storage.objects;
CREATE POLICY "payment_receipts_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (
      public.is_admin(auth.uid())
      OR public.user_has_tenant_role(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid,
        'owner'::app_role
      )
    )
  );

DROP POLICY IF EXISTS "payment_receipts_owner_select" ON storage.objects;
CREATE POLICY "payment_receipts_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.is_admin(auth.uid())
      OR public.user_has_tenant_role(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid,
        'owner'::app_role
      )
    )
  );

DROP POLICY IF EXISTS "payment_receipts_owner_update" ON storage.objects;
CREATE POLICY "payment_receipts_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.is_admin(auth.uid())
      OR public.user_has_tenant_role(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid,
        'owner'::app_role
      )
    )
  );

DROP POLICY IF EXISTS "payment_receipts_owner_delete" ON storage.objects;
CREATE POLICY "payment_receipts_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.is_admin(auth.uid())
      OR public.user_has_tenant_role(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid,
        'owner'::app_role
      )
    )
  );
