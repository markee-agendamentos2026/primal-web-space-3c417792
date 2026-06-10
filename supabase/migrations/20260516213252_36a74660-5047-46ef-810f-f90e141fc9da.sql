DROP POLICY IF EXISTS "owner writes services" ON public.services;
CREATE POLICY "staff writes services"
ON public.services
FOR ALL
TO public
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'professional'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'professional'::public.app_role)
);

DROP POLICY IF EXISTS "service photos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "service photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "service photos owner delete" ON storage.objects;

CREATE POLICY "service photos staff insert"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'service-photos'
  AND (
    public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::public.app_role)
  )
);

CREATE POLICY "service photos staff update"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'service-photos'
  AND (
    public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'service-photos'
  AND (
    public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::public.app_role)
  )
);

CREATE POLICY "service photos staff delete"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'service-photos'
  AND (
    public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::public.app_role)
  )
);
