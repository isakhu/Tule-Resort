-- Tule Resort Manager CMS
-- Run this migration in Supabase after the existing migrations.

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_items_public_read ON menu_items;
CREATE POLICY menu_items_public_read ON menu_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS menu_items_manager_insert ON menu_items;
CREATE POLICY menu_items_manager_insert ON menu_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin','manager')
    )
  );

DROP POLICY IF EXISTS menu_items_manager_update ON menu_items;
CREATE POLICY menu_items_manager_update ON menu_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin','manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin','manager')
    )
  );

DROP POLICY IF EXISTS menu_items_manager_delete ON menu_items;
CREATE POLICY menu_items_manager_delete ON menu_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin','manager')
    )
  );

-- Public image bucket used by the CMS. The manager can upload from the browser;
-- customers only need public read access to published images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resort-media', 'resort-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS resort_media_public_read ON storage.objects;
CREATE POLICY resort_media_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'resort-media');

DROP POLICY IF EXISTS resort_media_manager_insert ON storage.objects;
CREATE POLICY resort_media_manager_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resort-media'
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin','manager')
    )
  );

DROP POLICY IF EXISTS resort_media_manager_update ON storage.objects;
CREATE POLICY resort_media_manager_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resort-media'
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin','manager')
    )
  )
  WITH CHECK (
    bucket_id = 'resort-media'
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin','manager')
    )
  );

DROP POLICY IF EXISTS resort_media_manager_delete ON storage.objects;
CREATE POLICY resort_media_manager_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resort-media'
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin','manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_created_at ON menu_items(created_at DESC);
