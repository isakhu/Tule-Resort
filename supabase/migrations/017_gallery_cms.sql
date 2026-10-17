BEGIN;

CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  caption TEXT,
  category TEXT NOT NULL DEFAULT 'Resort',
  image_url TEXT NOT NULL,
  storage_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gallery_active_order_idx
  ON public.gallery (is_active, is_featured DESC, display_order, created_at DESC);

ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gallery_public_active_read ON public.gallery;
DROP POLICY IF EXISTS gallery_manager_select ON public.gallery;
DROP POLICY IF EXISTS gallery_manager_insert ON public.gallery;
DROP POLICY IF EXISTS gallery_manager_update ON public.gallery;
DROP POLICY IF EXISTS gallery_manager_delete ON public.gallery;

CREATE POLICY gallery_public_active_read
  ON public.gallery
  FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY gallery_manager_select
  ON public.gallery
  FOR SELECT TO authenticated
  USING (public.is_manager_or_admin());

CREATE POLICY gallery_manager_insert
  ON public.gallery
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY gallery_manager_update
  ON public.gallery
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY gallery_manager_delete
  ON public.gallery
  FOR DELETE TO authenticated
  USING (public.is_manager_or_admin());

CREATE OR REPLACE FUNCTION public.set_gallery_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gallery_set_updated_at ON public.gallery;
CREATE TRIGGER gallery_set_updated_at
BEFORE UPDATE ON public.gallery
FOR EACH ROW
EXECUTE FUNCTION public.set_gallery_updated_at();

COMMIT;
