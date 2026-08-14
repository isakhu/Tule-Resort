-- Tule Resort: allow authenticated admin/manager users to upload service media.
-- Run this migration in the Supabase SQL Editor for the live project.

INSERT INTO storage.buckets (id, name, public)
VALUES ('resort-media', 'resort-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS resort_media_manager_insert ON storage.objects;
CREATE POLICY resort_media_manager_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resort-media'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND r.name IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS resort_media_manager_update ON storage.objects;
CREATE POLICY resort_media_manager_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resort-media'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND r.name IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    bucket_id = 'resort-media'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND r.name IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS resort_media_manager_delete ON storage.objects;
CREATE POLICY resort_media_manager_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resort-media'
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND r.name IN ('admin', 'manager')
    )
  );
