-- Robust manager/admin authorization for Supabase Storage.
-- SECURITY DEFINER avoids public.users / public.roles RLS blocking the
-- authorization check inside storage.objects policies.

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS u
    JOIN public.roles AS r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.is_manager_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin() TO authenticated;

DROP POLICY IF EXISTS resort_media_manager_insert ON storage.objects;
CREATE POLICY resort_media_manager_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resort-media'
  AND public.is_manager_or_admin()
);

DROP POLICY IF EXISTS resort_media_manager_update ON storage.objects;
CREATE POLICY resort_media_manager_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resort-media'
  AND public.is_manager_or_admin()
)
WITH CHECK (
  bucket_id = 'resort-media'
  AND public.is_manager_or_admin()
);

DROP POLICY IF EXISTS resort_media_manager_delete ON storage.objects;
CREATE POLICY resort_media_manager_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resort-media'
  AND public.is_manager_or_admin()
);
