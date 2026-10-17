-- Migration 025: Phase 1 Auth, Roles, and Department-Based RLS Policies
-- 1. Helper function: has_department_access(dept_id)
-- 2. Replace any loose 'TO authenticated USING (true)' policies with role/department checks.
-- 3. Define explicit RLS policies for users, roles, departments, order_items, and staff access tables.

BEGIN;

-- 1. Helper function to check if the current user has access to a specific department
CREATE OR REPLACE FUNCTION public.has_department_access(dept_id INTEGER)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_manager_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.primary_department_id = dept_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.staff_department_access sda
      WHERE sda.user_id = auth.uid()
        AND sda.department_id = dept_id
    )
  );
$$;

REVOKE ALL ON FUNCTION public.has_department_access(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_department_access(INTEGER) TO authenticated;

-- 2. dining_tables: replace loose authenticated policies with role & department checks
DROP POLICY IF EXISTS dining_tables_staff_all ON public.dining_tables;
DROP POLICY IF EXISTS dining_tables_staff_manage ON public.dining_tables;

CREATE POLICY dining_tables_staff_manage ON public.dining_tables
  FOR ALL TO authenticated
  USING (
    is_manager_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.departments d ON d.id = u.primary_department_id
      WHERE u.id = auth.uid() AND lower(d.name) IN ('restaurant', 'kitchen', 'cafeteria')
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_department_access sda
      JOIN public.departments d ON d.id = sda.department_id
      WHERE sda.user_id = auth.uid() AND lower(d.name) IN ('restaurant', 'kitchen', 'cafeteria')
    )
  )
  WITH CHECK (
    is_manager_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.departments d ON d.id = u.primary_department_id
      WHERE u.id = auth.uid() AND lower(d.name) IN ('restaurant', 'kitchen', 'cafeteria')
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_department_access sda
      JOIN public.departments d ON d.id = sda.department_id
      WHERE sda.user_id = auth.uid() AND lower(d.name) IN ('restaurant', 'kitchen', 'cafeteria')
    )
  );

-- 3. roles: ensure RLS policies exist
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_read_authenticated ON public.roles;
CREATE POLICY roles_read_authenticated ON public.roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS roles_admin_manage ON public.roles;
CREATE POLICY roles_admin_manage ON public.roles
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- 4. departments: ensure RLS policies exist
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS departments_public_read ON public.departments;
CREATE POLICY departments_public_read ON public.departments
  FOR SELECT
  USING (is_active = true OR is_staff_or_manager_or_admin());

DROP POLICY IF EXISTS departments_admin_manage ON public.departments;
CREATE POLICY departments_admin_manage ON public.departments
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- 5. users: ensure RLS policies exist
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_read ON public.users;
CREATE POLICY users_self_read ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_manager_or_admin());

DROP POLICY IF EXISTS users_admin_manage ON public.users;
CREATE POLICY users_admin_manage ON public.users
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- 6. order_items: ensure staff in relevant departments can view order items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_items_staff_select ON public.order_items;
CREATE POLICY order_items_staff_select ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          is_manager_or_admin()
          OR has_department_access(o.department_id)
          OR o.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS order_items_admin_manage ON public.order_items;
CREATE POLICY order_items_admin_manage ON public.order_items
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- 7. staff_department_access & staff_item_permissions: ensure policies exist
ALTER TABLE public.staff_department_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sda_self_read ON public.staff_department_access;
CREATE POLICY sda_self_read ON public.staff_department_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_manager_or_admin());

DROP POLICY IF EXISTS sda_admin_manage ON public.staff_department_access;
CREATE POLICY sda_admin_manage ON public.staff_department_access
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

ALTER TABLE public.staff_item_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sip_self_read ON public.staff_item_permissions;
CREATE POLICY sip_self_read ON public.staff_item_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_manager_or_admin());

DROP POLICY IF EXISTS sip_admin_manage ON public.staff_item_permissions;
CREATE POLICY sip_admin_manage ON public.staff_item_permissions
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

COMMIT;
