-- Migration: Sync `auth.users` into `public.users` and provide diagnostic views
-- Run in Supabase SQL Editor in a staging environment first.

BEGIN;

-- 1) Insert any missing `public.users` rows for existing auth users.
--    We avoid overwriting existing rows and only create minimal user records
--    with the same UUID so RLS predicates referencing auth.uid() will match.
INSERT INTO public.users (id, email, metadata, created_at)
SELECT a.id, a.email, '{}'::jsonb, now()
FROM auth.users a
LEFT JOIN public.users u ON u.id = a.id
WHERE u.id IS NULL;

-- 2) Create diagnostic views so operators can inspect mismatches.
CREATE OR REPLACE VIEW public.auth_missing_public_users AS
SELECT a.id AS auth_user_id, a.email
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
WHERE u.id IS NULL;

CREATE OR REPLACE VIEW public.public_users_orphans AS
SELECT u.id AS public_user_id, u.email, u.created_at
FROM public.users u
LEFT JOIN auth.users a ON u.id = a.id
WHERE a.id IS NULL;

COMMIT;

-- Notes:
-- - This migration intentionally does not attempt to set `role_id`, `primary_department_id`,
--   or other application-specific columns; those should be set manually or via a separate
--   reconciliation process after verifying the created rows.
-- - Creating an auth user should always be done via the server admin API (`supabaseServer.auth.admin.createUser()`),
--   then insert into `public.users` with the returned `id`. If the DB insert fails, delete the created auth user
--   to avoid orphaned auth accounts.
-- - Review the views `public.auth_missing_public_users` and `public.public_users_orphans` after running.
