-- Migration: add `is_active` flag to departments and mark 'Sauna' inactive if present
-- Run in Supabase SQL Editor. Safe and idempotent.

BEGIN;

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE departments SET is_active = FALSE WHERE name = 'Sauna';

COMMIT;

-- Notes: This preserves the department row but flags it inactive. If you prefer deletion,
-- run: DELETE FROM departments WHERE name = 'Sauna'; but ensure you understand cascading effects.
