-- Fix rooms RLS policies: they queried public.users/public.roles directly,
-- which is blocked by RLS on those tables (no SELECT policy exists on
-- public.users), so the EXISTS check always failed for every user,
-- including real admins. Reuse the SECURITY DEFINER helper already
-- created in 011_manager_storage_rls_fix.sql, which bypasses that problem.

DROP POLICY IF EXISTS rooms_manager_insert ON public.rooms;
CREATE POLICY rooms_manager_insert ON public.rooms FOR INSERT TO authenticated
WITH CHECK (public.is_manager_or_admin());

DROP POLICY IF EXISTS rooms_manager_update ON public.rooms;
CREATE POLICY rooms_manager_update ON public.rooms FOR UPDATE TO authenticated
USING (public.is_manager_or_admin())
WITH CHECK (public.is_manager_or_admin());

DROP POLICY IF EXISTS rooms_manager_delete ON public.rooms;
CREATE POLICY rooms_manager_delete ON public.rooms FOR DELETE TO authenticated
USING (public.is_manager_or_admin());