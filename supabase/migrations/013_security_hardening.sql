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

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on rooms" ON public.rooms;
DROP POLICY IF EXISTS rooms_public_read ON public.rooms;
DROP POLICY IF EXISTS "Public can view active rooms" ON public.rooms;
CREATE POLICY rooms_public_active_read ON public.rooms
  FOR SELECT TO public
  USING (is_active = true);
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

ALTER TABLE public.service_offerings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on service_offerings" ON public.service_offerings;
DROP POLICY IF EXISTS service_offerings_public_read ON public.service_offerings;
DROP POLICY IF EXISTS "Public can view active service offerings" ON public.service_offerings;
CREATE POLICY service_offerings_public_active_read ON public.service_offerings
  FOR SELECT TO public
  USING (is_active = true);

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
    SELECT 1 FROM pg_constraint
    WHERE conname = 'room_reservations_payment_method_check'
      AND conrelid = 'public.room_reservations'::regclass
  ) THEN
    ALTER TABLE public.room_reservations
      ADD CONSTRAINT room_reservations_payment_method_check
      CHECK (payment_method IN ('pay_at_resort'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
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
-- 4) Orders: remove public read/update and harden server-side guest creation
-- -----------------------------------------------------------------------------

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow guest order creation" ON public.orders;
DROP POLICY IF EXISTS "Allow guest order reading" ON public.orders;
DROP POLICY IF EXISTS "Allow staff status updates" ON public.orders;
DROP POLICY IF EXISTS orders_select_staff ON public.orders;
DROP POLICY IF EXISTS orders_insert_staff_admin ON public.orders;
DROP POLICY IF EXISTS orders_update_staff ON public.orders;

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

-- Guest orders are inserted through the server-side API using service_role.
-- No direct anon/authenticated INSERT policy is intentionally provided.

-- Atomic order creation for the server API. Prices are always read from the
-- live menu_items table; invalid/inactive items are rejected.
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_user_id UUID,
  p_department_id INTEGER,
  p_room_number TEXT,
  p_guest_name TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC(10,2) := 0;
  v_item JSONB;
  v_menu_item_id UUID;
  v_quantity INTEGER;
  v_price NUMERIC(10,2);
BEGIN
  IF p_department_id IS NULL THEN
    RAISE EXCEPTION 'department_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.departments d
    WHERE d.id = p_department_id
      AND COALESCE(d.is_active, true) = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive department';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := NULLIF(v_item->>'menu_item_id', '')::UUID;
    v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 0);

    IF v_menu_item_id IS NULL OR v_quantity < 1 OR v_quantity > 50 THEN
      RAISE EXCEPTION 'Invalid order item or quantity';
    END IF;

    SELECT mi.price
      INTO v_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND COALESCE(mi.is_active, true) = true;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'Menu item is unavailable';
    END IF;

    v_total := v_total + (v_price * v_quantity);
  END LOOP;

  INSERT INTO public.orders (
    user_id,
    department_id,
    status_id,
    total,
    notes,
    room_number
  )
  VALUES (
    p_user_id,
    p_department_id,
    (SELECT id FROM public.order_statuses WHERE name = 'Pending' LIMIT 1),
    v_total,
    NULLIF(trim(p_notes), ''),
    NULLIF(trim(p_room_number), '')
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := NULLIF(v_item->>'menu_item_id', '')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT mi.price INTO v_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND COALESCE(mi.is_active, true) = true;

    INSERT INTO public.order_items (order_id, menu_item_id, quantity, price)
    VALUES (v_order_id, v_menu_item_id, v_quantity, v_price);
  END LOOP;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) TO service_role;

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
