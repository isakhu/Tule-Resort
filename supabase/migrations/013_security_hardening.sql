-- Tule Resort security hardening based on the verified live Supabase schema.
-- Safe/idempotent: removes unsafe duplicate policies and adds missing reservation fields.
-- Run AFTER the existing migrations in the live Supabase project.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Shared authorization helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS u
    JOIN public.roles AS r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.is_manager_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_staff_or_manager_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS u
    JOIN public.roles AS r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'manager', 'staff')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_or_manager_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_or_manager_or_admin() TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) Public content: only active records are public
-- -----------------------------------------------------------------------------

-- menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on menu_items" ON public.menu_items;
DROP POLICY IF EXISTS menu_items_public_read ON public.menu_items;
DROP POLICY IF EXISTS menu_items_public_read_active ON public.menu_items;
DROP POLICY IF EXISTS menu_items_select_active ON public.menu_items;
DROP POLICY IF EXISTS menu_items_public_active_read ON public.menu_items;
DROP POLICY IF EXISTS menu_items_admin_manager_all ON public.menu_items;
DROP POLICY IF EXISTS menu_items_manager_insert ON public.menu_items;
DROP POLICY IF EXISTS menu_items_manager_update ON public.menu_items;
DROP POLICY IF EXISTS menu_items_manager_delete ON public.menu_items;
CREATE POLICY menu_items_public_active_read ON public.menu_items
  FOR SELECT TO public
  USING (is_active = true);
CREATE POLICY menu_items_manager_insert ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin());
CREATE POLICY menu_items_manager_update ON public.menu_items
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());
CREATE POLICY menu_items_manager_delete ON public.menu_items
  FOR DELETE TO authenticated
  USING (public.is_manager_or_admin());

-- rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on rooms" ON public.rooms;
DROP POLICY IF EXISTS rooms_public_read ON public.rooms;
DROP POLICY IF EXISTS "Public can view active rooms" ON public.rooms;
CREATE POLICY rooms_public_active_read ON public.rooms
  FOR SELECT TO public
  USING (is_active = true);
-- Keep the existing helper-backed write policies, recreating them for clarity.
DROP POLICY IF EXISTS rooms_manager_insert ON public.rooms;
DROP POLICY IF EXISTS rooms_manager_update ON public.rooms;
DROP POLICY IF EXISTS rooms_manager_delete ON public.rooms;
CREATE POLICY rooms_manager_insert ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin());
CREATE POLICY rooms_manager_update ON public.rooms
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());
CREATE POLICY rooms_manager_delete ON public.rooms
  FOR DELETE TO authenticated
  USING (public.is_manager_or_admin());

-- resort_services
ALTER TABLE public.resort_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on resort_services" ON public.resort_services;
DROP POLICY IF EXISTS resort_services_public_read ON public.resort_services;
DROP POLICY IF EXISTS "Public can view active resort services" ON public.resort_services;
DROP POLICY IF EXISTS resort_services_manager_insert ON public.resort_services;
DROP POLICY IF EXISTS resort_services_manager_update ON public.resort_services;
DROP POLICY IF EXISTS resort_services_manager_delete ON public.resort_services;
CREATE POLICY resort_services_public_active_read ON public.resort_services
  FOR SELECT TO public
  USING (is_active = true);
CREATE POLICY resort_services_manager_insert ON public.resort_services
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin());
CREATE POLICY resort_services_manager_update ON public.resort_services
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());
CREATE POLICY resort_services_manager_delete ON public.resort_services
  FOR DELETE TO authenticated
  USING (public.is_manager_or_admin());

-- service_offerings
ALTER TABLE public.service_offerings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on service_offerings" ON public.service_offerings;
DROP POLICY IF EXISTS service_offerings_public_read ON public.service_offerings;
DROP POLICY IF EXISTS "Public can view active service offerings" ON public.service_offerings;
CREATE POLICY service_offerings_public_active_read ON public.service_offerings
  FOR SELECT TO public
  USING (is_active = true);

-- event_venues
ALTER TABLE public.event_venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on event_venues" ON public.event_venues;
DROP POLICY IF EXISTS "Public can view active event venues" ON public.event_venues;
CREATE POLICY event_venues_public_active_read ON public.event_venues
  FOR SELECT TO public
  USING (is_active = true);

-- -----------------------------------------------------------------------------
-- 3) Reservations: align the live schema with the manager UI and secure writes
-- -----------------------------------------------------------------------------

ALTER TABLE public.room_reservations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.room_reservations
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'pay_at_resort',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'room_reservations_payment_method_check'
      AND conrelid = 'public.room_reservations'::regclass
  ) THEN
    ALTER TABLE public.room_reservations
      ADD CONSTRAINT room_reservations_payment_method_check
      CHECK (payment_method IN ('pay_at_resort'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'room_reservations_payment_status_check'
      AND conrelid = 'public.room_reservations'::regclass
  ) THEN
    ALTER TABLE public.room_reservations
      ADD CONSTRAINT room_reservations_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;
END
$$;

DROP POLICY IF EXISTS "Guests can create room reservations" ON public.room_reservations;
DROP POLICY IF EXISTS room_reservations_guest_insert ON public.room_reservations;
DROP POLICY IF EXISTS "Managers can view room reservations" ON public.room_reservations;
DROP POLICY IF EXISTS room_reservations_manager_select ON public.room_reservations;
DROP POLICY IF EXISTS room_reservations_manager_update ON public.room_reservations;
DROP POLICY IF EXISTS room_reservations_manager_delete ON public.room_reservations;

-- Reservations are now created through the server-side reservation API using the
-- service role. There is intentionally no anon INSERT policy.
CREATE POLICY room_reservations_manager_select ON public.room_reservations
  FOR SELECT TO authenticated
  USING (public.is_manager_or_admin());

CREATE POLICY room_reservations_manager_update ON public.room_reservations
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY room_reservations_manager_delete ON public.room_reservations
  FOR DELETE TO authenticated
  USING (public.is_manager_or_admin());

CREATE INDEX IF NOT EXISTS room_reservations_payment_status_idx
  ON public.room_reservations (payment_status);

-- -----------------------------------------------------------------------------
-- 4) Orders: remove public read/update and let the server API own guest writes
-- -----------------------------------------------------------------------------

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow guest order creation" ON public.orders;
DROP POLICY IF EXISTS "Allow guest order reading" ON public.orders;
DROP POLICY IF EXISTS "Allow staff status updates" ON public.orders;
DROP POLICY IF EXISTS orders_select_staff ON public.orders;
DROP POLICY IF EXISTS orders_insert_staff_admin ON public.orders;
DROP POLICY IF EXISTS orders_update_staff ON public.orders;

-- Guest ordering is performed by the server-side order API using the service role.
-- Staff/admin clients may read and update operational orders through their department.
CREATE POLICY orders_select_staff ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_manager_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.primary_department_id = orders.department_id
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_department_access sda
      WHERE sda.user_id = auth.uid()
        AND sda.department_id = orders.department_id
    )
    OR orders.user_id = auth.uid()
  );

CREATE POLICY orders_update_staff ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.is_manager_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.primary_department_id = orders.department_id
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_department_access sda
      WHERE sda.user_id = auth.uid()
        AND sda.department_id = orders.department_id
    )
  )
  WITH CHECK (
    public.is_manager_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.primary_department_id = orders.department_id
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_department_access sda
      WHERE sda.user_id = auth.uid()
        AND sda.department_id = orders.department_id
    )
  );

-- Direct client INSERT is intentionally disabled. The server order API uses the
-- service role so the operation remains available to guests.

-- -----------------------------------------------------------------------------
-- 5) Notifications: standardize manager checks on the secure helper
-- -----------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_select_user ON public.notifications;
DROP POLICY IF EXISTS notifications_update_user ON public.notifications;

CREATE POLICY notifications_select_user ON public.notifications
  FOR SELECT TO authenticated
  USING (
    notifications.user_id = auth.uid()
    OR public.is_manager_or_admin()
  );

CREATE POLICY notifications_insert_admin ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY notifications_update_user ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    notifications.user_id = auth.uid()
    OR public.is_manager_or_admin()
  )
  WITH CHECK (
    notifications.user_id = auth.uid()
    OR public.is_manager_or_admin()
  );

COMMIT;
