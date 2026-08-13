-- RLS policies for Haile Resort
-- Review and test in a staging environment before applying to production.

-- Enable RLS on tables that should be protected
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Helper: role id lookup (we'll inline queries inside policies)

-- Policy: allow managers/admins full access; staff limited to their departments
-- Orders: SELECT
DROP POLICY IF EXISTS orders_select_staff ON orders;
CREATE POLICY orders_select_staff ON orders
  FOR SELECT
  USING (
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
    )
    OR
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.primary_department_id = orders.department_id)
    )
    OR
    (
      EXISTS (SELECT 1 FROM staff_department_access sda WHERE sda.user_id = auth.uid() AND sda.department_id = orders.department_id)
    )
    OR
    (auth.role() = 'authenticated' AND orders.user_id = auth.uid())
  );

-- Orders: INSERT
-- Guest orders MUST be created via the server-side API using the service role key (bypasses RLS).
-- This INSERT policy only allows authenticated staff/admin users to insert directly if needed.
DROP POLICY IF EXISTS orders_insert_staff_admin ON orders;
CREATE POLICY orders_insert_staff_admin ON orders
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.primary_department_id = orders.department_id)
    OR EXISTS (SELECT 1 FROM staff_department_access sda WHERE sda.user_id = auth.uid() AND sda.department_id = orders.department_id)
  );

-- Orders: UPDATE — allow staff in the department or admins/managers to update (e.g., status changes)
DROP POLICY IF EXISTS orders_update_staff ON orders;
CREATE POLICY orders_update_staff ON orders
  FOR UPDATE
  USING (
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
    )
    OR
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.primary_department_id = orders.department_id)
    )
    OR
    (
      EXISTS (SELECT 1 FROM staff_department_access sda WHERE sda.user_id = auth.uid() AND sda.department_id = orders.department_id)
    )
  )
  WITH CHECK (
    -- Ensure the updated row still targets the same department or is handled by an admin.
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
    )
    OR
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.primary_department_id = orders.department_id)
    )
    OR
    (
      EXISTS (SELECT 1 FROM staff_department_access sda WHERE sda.user_id = auth.uid() AND sda.department_id = orders.department_id)
    )
  );

-- Requests: SELECT
DROP POLICY IF EXISTS requests_select_staff ON requests;
CREATE POLICY requests_select_staff ON requests
  FOR SELECT
  USING (
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
    )
    OR
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.primary_department_id = requests.department_id)
    )
    OR
    (
      EXISTS (SELECT 1 FROM staff_department_access sda WHERE sda.user_id = auth.uid() AND sda.department_id = requests.department_id)
    )
    OR
    (auth.role() = 'authenticated' AND requests.user_id = auth.uid())
  );

-- Requests: UPDATE — allow staff in the department or admins/managers to update status/details
DROP POLICY IF EXISTS requests_update_staff ON requests;
CREATE POLICY requests_update_staff ON requests
  FOR UPDATE
  USING (
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
    )
    OR
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.primary_department_id = requests.department_id)
    )
    OR
    (
      EXISTS (SELECT 1 FROM staff_department_access sda WHERE sda.user_id = auth.uid() AND sda.department_id = requests.department_id)
    )
  )
  WITH CHECK (
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
    )
    OR
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.primary_department_id = requests.department_id)
    )
    OR
    (
      EXISTS (SELECT 1 FROM staff_department_access sda WHERE sda.user_id = auth.uid() AND sda.department_id = requests.department_id)
    )
  );

-- Notifications: SELECT by recipient or admin
DROP POLICY IF EXISTS notifications_select_user ON notifications;
CREATE POLICY notifications_select_user ON notifications
  FOR SELECT
  USING (
    (notifications.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
  );

-- Notifications: INSERT should be performed by server-side processes (service role / DB trigger).
-- Disallow general client-side inserts; only allow admins/managers to insert if necessary.
DROP POLICY IF EXISTS notifications_insert_admin ON notifications;
CREATE POLICY notifications_insert_admin ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
  );

-- Notifications: UPDATE — allow recipient to mark their notifications as read, or admins/managers to update any
DROP POLICY IF EXISTS notifications_update_user ON notifications;
CREATE POLICY notifications_update_user ON notifications
  FOR UPDATE
  USING (
    (notifications.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
  )
  WITH CHECK (
    (notifications.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role_id IN (SELECT id FROM roles WHERE name IN ('admin','manager')))
  );

-- Notes:
-- 1) These policies assume `users` table is kept in sync with Supabase Auth user IDs.
-- 2) Guest ordering should be implemented using server-side APIs which use the service role key (bypasses RLS).
-- 3) Test thoroughly in a staging environment: RLS can block legitimate client queries if policies are too strict.
