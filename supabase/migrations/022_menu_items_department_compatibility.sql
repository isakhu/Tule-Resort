-- Compatibility fix for older Tule Resort databases where menu_items lacks department_id.
-- Safe to run even when the column already exists.

BEGIN;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_department_id
  ON public.menu_items(department_id);

COMMIT;
