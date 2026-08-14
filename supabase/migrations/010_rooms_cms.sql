-- Rooms CMS: manager-controlled room inventory/content.

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Standard',
  category TEXT DEFAULT 'Accommodation',
  description TEXT,
  short_description TEXT,
  price_per_night NUMERIC(12,2) DEFAULT 0,
  base_price NUMERIC(12,2) DEFAULT 0,
  capacity INTEGER DEFAULT 2,
  max_occupancy INTEGER DEFAULT 2,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Standard';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Accommodation';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS price_per_night NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS base_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 2;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS max_occupancy INTEGER DEFAULT 2;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS rooms_slug_unique_idx ON public.rooms(slug) WHERE slug IS NOT NULL;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rooms_public_read ON public.rooms;
CREATE POLICY rooms_public_read ON public.rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS rooms_manager_insert ON public.rooms;
CREATE POLICY rooms_manager_insert ON public.rooms FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid() AND r.name IN ('admin', 'manager')
));

DROP POLICY IF EXISTS rooms_manager_update ON public.rooms;
CREATE POLICY rooms_manager_update ON public.rooms FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid() AND r.name IN ('admin', 'manager')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid() AND r.name IN ('admin', 'manager')
));

DROP POLICY IF EXISTS rooms_manager_delete ON public.rooms;
CREATE POLICY rooms_manager_delete ON public.rooms FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid() AND r.name IN ('admin', 'manager')
));
