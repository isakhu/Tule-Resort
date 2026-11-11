-- Migration: 035_clean_public_cms_content.sql
-- Purpose:
--   Keep obvious placeholder content out of the public resort experience without
--   deleting records or inventing replacement room names/prices.
--   Correct legacy "Haile" branding in Restaurant CMS copy.
--
-- Notes:
--   - Placeholder rooms are deactivated, not deleted. Staff can correct and reactivate them.
--   - Zero or negative nightly rates are not publishable or bookable.
--   - Placeholder gallery entries are deactivated, not deleted.
--   - Menu text is changed only where the standalone word "Haile" appears.

BEGIN;

UPDATE public.rooms
SET is_active = false,
    updated_at = now()
WHERE is_active = true
  AND (
    lower(trim(coalesce(name, ''))) IN ('aa', 'white')
    OR coalesce(price_per_night, 0) <= 0
  );

UPDATE public.gallery
SET is_active = false,
    updated_at = now()
WHERE is_active = true
  AND lower(trim(coalesce(title, ''))) IN ('ggg', 'chilling');

UPDATE public.menu_items
SET
  name = regexp_replace(name, '\mHaile\M', 'Tule', 'gi'),
  category = regexp_replace(category, '\mHaile\M', 'Tule', 'gi'),
  description = regexp_replace(description, '\mHaile\M', 'Tule', 'gi')
WHERE concat_ws(' ', name, category, description) ~* '\mHaile\M';

COMMIT;
