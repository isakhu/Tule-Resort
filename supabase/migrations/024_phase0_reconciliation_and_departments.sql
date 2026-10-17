-- Migration 024: Phase 0 Schema Reconciliation and Department Seeding
-- 1. Ensure all standard resort departments exist and are active.
-- 2. Backfill menu_items.department_id based on department text.
-- 3. Reconcile orders table: add guest_name and ensure dining_table_id support.
-- 4. Reconcile dining_tables: ensure table, RLS, and default data exist.
-- 5. Reconcile create_guest_order: support guest_name, table_token, resilient text menu_item_id, and auto department resolution.

BEGIN;

-- 1. Seed missing departments and ensure standard departments are active
INSERT INTO public.departments (name, is_active)
VALUES
  ('Kitchen', true),
  ('Front Desk', true),
  ('Housekeeping', true),
  ('Spa', true),
  ('Gym', true),
  ('Pool', true),
  ('Restaurant', true),
  ('Cafeteria', true)
ON CONFLICT (name) DO UPDATE
SET is_active = true;

-- 2. Ensure menu_items has department_id column, foreign key, and index
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_department_id
  ON public.menu_items(department_id);

-- Backfill menu_items.department_id by matching name
UPDATE public.menu_items mi
SET department_id = d.id
FROM public.departments d
WHERE mi.department_id IS NULL
  AND lower(trim(mi.department)) = lower(trim(d.name));

-- Any remaining menu_items with null department_id default to Restaurant (or Kitchen)
UPDATE public.menu_items
SET department_id = (SELECT id FROM public.departments WHERE name = 'Restaurant' LIMIT 1)
WHERE department_id IS NULL;

-- 3. Ensure dining_tables exists (needed for table QR ordering)
CREATE TABLE IF NOT EXISTS public.dining_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  section TEXT NOT NULL DEFAULT 'Floor 1',
  capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0 AND capacity <= 30),
  status TEXT NOT NULL DEFAULT 'available',
  is_active BOOLEAN NOT NULL DEFAULT true,
  pos_x NUMERIC(5,2) DEFAULT 0,
  pos_y NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dining_tables_qr_token ON public.dining_tables(qr_token);
CREATE INDEX IF NOT EXISTS idx_dining_tables_section ON public.dining_tables(section);

ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dining_tables_public_read ON public.dining_tables;
CREATE POLICY dining_tables_public_read ON public.dining_tables
  FOR SELECT TO public
  USING (is_active = true);

DROP POLICY IF EXISTS dining_tables_staff_manage ON public.dining_tables;
CREATE POLICY dining_tables_staff_manage ON public.dining_tables
  FOR ALL TO authenticated
  USING (is_manager_or_admin() OR is_staff_or_manager_or_admin())
  WITH CHECK (is_manager_or_admin() OR is_staff_or_manager_or_admin());

-- Seed initial dining tables if table is empty
INSERT INTO public.dining_tables (table_number, qr_token, section, capacity, status, is_active, pos_x, pos_y)
VALUES
  ('Table 01', 'tule-tbl-01-lakeview', 'Floor 1', 2, 'available', true, 18, 20),
  ('Table 02', 'tule-tbl-02-lakeview', 'Floor 1', 4, 'available', true, 36, 20),
  ('Table 03', 'tule-tbl-03-lakeview', 'Floor 1', 4, 'available', true, 54, 20),
  ('Table 04', 'tule-tbl-04-lakeview', 'Floor 1', 4, 'available', true, 72, 20),
  ('Table 05', 'tule-tbl-05-lakeview', 'Floor 1', 6, 'available', true, 88, 35),
  ('Table 06', 'tule-tbl-06-lakeview', 'Floor 1', 2, 'available', true, 18, 45),
  ('Table 07', 'tule-tbl-07-lakeview', 'Floor 1', 4, 'available', true, 36, 45),
  ('Table 08', 'tule-tbl-08-lakeview', 'Floor 1', 4, 'available', true, 54, 45),
  ('Table 09', 'tule-tbl-09-lakeview', 'Floor 1', 4, 'available', true, 72, 45),
  ('Table 10', 'tule-tbl-10-lakeview', 'Floor 1', 6, 'available', true, 88, 60),
  ('Table 11', 'tule-tbl-11-lakeview', 'Floor 1', 2, 'available', true, 18, 72),
  ('Table 12', 'tule-tbl-12-lakeview', 'Floor 1', 4, 'available', true, 36, 72),
  ('Table 13', 'tule-tbl-13-lakeview', 'Floor 1', 4, 'available', true, 54, 72),
  ('Table 14', 'tule-tbl-14-lakeview', 'Floor 1', 4, 'available', true, 72, 72),
  ('Table 15', 'tule-tbl-15-lakeview', 'Floor 1', 8, 'available', true, 50, 90),
  ('Terrace 01', 'tule-tbl-t01-sunset', 'Lake Terrace', 4, 'available', true, 20, 25),
  ('Terrace 02', 'tule-tbl-t02-sunset', 'Lake Terrace', 4, 'available', true, 40, 25),
  ('Terrace 03', 'tule-tbl-t03-sunset', 'Lake Terrace', 2, 'available', true, 60, 25),
  ('Terrace 04', 'tule-tbl-t04-sunset', 'Lake Terrace', 6, 'available', true, 80, 25),
  ('Terrace 05', 'tule-tbl-t05-sunset', 'Lake Terrace', 4, 'available', true, 30, 65),
  ('Terrace 06', 'tule-tbl-t06-sunset', 'Lake Terrace', 4, 'available', true, 70, 65),
  ('Pool 01', 'tule-tbl-p01-breeze', 'Poolside', 2, 'available', true, 25, 40),
  ('Pool 02', 'tule-tbl-p02-breeze', 'Poolside', 4, 'available', true, 50, 40),
  ('Pool 03', 'tule-tbl-p03-breeze', 'Poolside', 4, 'available', true, 75, 40)
ON CONFLICT (table_number) DO NOTHING;

-- 4. Reconcile orders table: add guest_name and dining_table_id
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dining_table_id UUID REFERENCES public.dining_tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_dining_table_id
  ON public.orders(dining_table_id);

CREATE INDEX IF NOT EXISTS idx_orders_department_id
  ON public.orders(department_id);

CREATE INDEX IF NOT EXISTS idx_orders_status_id
  ON public.orders(status_id);

-- 5. Reconcile create_guest_order function
-- Supports 7 parameters (with p_table_token), and provides default so 6-parameter calls continue to work seamlessly.
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_user_id UUID,
  p_department_id INTEGER,
  p_room_number TEXT,
  p_guest_name TEXT,
  p_notes TEXT,
  p_items JSONB,
  p_table_token TEXT DEFAULT NULL
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
  v_menu_item_id TEXT;
  v_quantity INTEGER;
  v_price NUMERIC(10,2);
  v_status_id INTEGER;
  v_department_id INTEGER := p_department_id;
  v_item_department_id INTEGER;
  v_table_id UUID := NULL;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  -- Validate table token if provided
  IF p_table_token IS NOT NULL AND trim(p_table_token) <> '' THEN
    SELECT dt.id
    INTO v_table_id
    FROM public.dining_tables dt
    WHERE dt.qr_token = trim(p_table_token)
      AND dt.is_active = true
    LIMIT 1;

    IF v_table_id IS NULL THEN
      RAISE EXCEPTION 'Invalid or deactivated dining table QR code';
    END IF;
  END IF;

  -- Resolve default Pending status
  SELECT id
  INTO v_status_id
  FROM public.order_statuses
  WHERE lower(name) = 'pending'
  LIMIT 1;

  IF v_status_id IS NULL THEN
    RAISE EXCEPTION 'Pending order status is not configured';
  END IF;

  -- Calculate server-verified total and derive department if not passed
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := trim(COALESCE(v_item->>'menu_item_id', v_item->>'menuItemId', ''));
    v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 0);

    IF v_menu_item_id IS NULL OR v_menu_item_id = '' OR v_quantity < 1 OR v_quantity > 50 THEN
      RAISE EXCEPTION 'Invalid order item or quantity';
    END IF;

    SELECT mi.price, mi.department_id
    INTO v_price, v_item_department_id
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND COALESCE(mi.is_active, true) = true;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'Menu item "%" is unavailable or does not exist', v_menu_item_id;
    END IF;

    -- If department_id was not provided, derive it from the menu items
    IF v_department_id IS NULL AND v_item_department_id IS NOT NULL THEN
      v_department_id := v_item_department_id;
    END IF;

    v_total := v_total + (v_price * v_quantity);
  END LOOP;

  -- If still no department resolved, fallback to Kitchen or Restaurant
  IF v_department_id IS NULL THEN
    SELECT id INTO v_department_id
    FROM public.departments
    WHERE name = 'Kitchen' AND is_active = true
    LIMIT 1;
  END IF;

  IF v_department_id IS NULL THEN
    SELECT id INTO v_department_id
    FROM public.departments
    WHERE is_active = true
    LIMIT 1;
  END IF;

  -- Create order record
  INSERT INTO public.orders (
    user_id,
    department_id,
    status_id,
    total,
    notes,
    room_number,
    guest_name,
    dining_table_id
  )
  VALUES (
    p_user_id,
    v_department_id,
    v_status_id,
    v_total,
    NULLIF(trim(p_notes), ''),
    NULLIF(trim(p_room_number), ''),
    COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'),
    v_table_id
  )
  RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := trim(COALESCE(v_item->>'menu_item_id', v_item->>'menuItemId', ''));
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT mi.price
    INTO v_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND COALESCE(mi.is_active, true) = true;

    INSERT INTO public.order_items (order_id, menu_item_id, quantity, price)
    VALUES (v_order_id, v_menu_item_id, v_quantity, v_price);
  END LOOP;

  RETURN v_order_id;
END;
$$;

COMMIT;
