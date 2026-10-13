-- Migration 021: Dining Tables and QR-Code Table Ordering
-- Additive migration: Preserves all existing tables, orders, and room-service functionality.

BEGIN;

-- 1. Create dining_tables table
CREATE TABLE IF NOT EXISTS public.dining_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  section TEXT NOT NULL DEFAULT 'Floor 1' CHECK (section IN ('Floor 1', 'Lake Terrace', 'Poolside', 'VIP Lounge')),
  capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0 AND capacity <= 30),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'cleaning', 'out_of_service')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  pos_x NUMERIC(5,2) DEFAULT 0,
  pos_y NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast QR token lookup when guests scan
CREATE INDEX IF NOT EXISTS idx_dining_tables_qr_token ON public.dining_tables(qr_token);
CREATE INDEX IF NOT EXISTS idx_dining_tables_section ON public.dining_tables(section);

-- 2. Add dining_table_id and guest_name to orders (safe IF NOT EXISTS)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dining_table_id UUID REFERENCES public.dining_tables(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_dining_table_id ON public.orders(dining_table_id);

-- 3. Row-Level Security for dining_tables
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;

-- Guests can read active tables by QR or table number
DROP POLICY IF EXISTS dining_tables_public_read ON public.dining_tables;
CREATE POLICY dining_tables_public_read ON public.dining_tables
  FOR SELECT TO public
  USING (is_active = true);

-- Authenticated staff/admins have full management rights
DROP POLICY IF EXISTS dining_tables_staff_all ON public.dining_tables;
CREATE POLICY dining_tables_staff_all ON public.dining_tables
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Overload create_guest_order with optional p_table_token
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
  v_menu_item_id UUID;
  v_quantity INTEGER;
  v_price NUMERIC(10,2);
  v_status_id INTEGER;
  v_table_id UUID := NULL;
BEGIN
  IF p_department_id IS NULL THEN
    RAISE EXCEPTION 'department_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.departments d
    WHERE d.id = p_department_id
  ) THEN
    RAISE EXCEPTION 'Invalid department';
  END IF;

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

  SELECT id
  INTO v_status_id
  FROM public.order_statuses
  WHERE name = 'Pending'
  LIMIT 1;

  IF v_status_id IS NULL THEN
    RAISE EXCEPTION 'Pending order status is not configured';
  END IF;

  -- Calculate server-verified total
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

  -- Create order with dining_table_id and guest_name
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
    p_department_id,
    v_status_id,
    v_total,
    NULLIF(trim(p_notes), ''),
    NULLIF(trim(p_room_number), ''),
    NULLIF(trim(p_guest_name), ''),
    v_table_id
  )
  RETURNING id INTO v_order_id;

  -- Mark table as occupied when order is accepted
  IF v_table_id IS NOT NULL THEN
    UPDATE public.dining_tables
    SET status = 'occupied', updated_at = now()
    WHERE id = v_table_id AND status = 'available';
  END IF;

  -- Insert order items
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := NULLIF(v_item->>'menu_item_id', '')::UUID;
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

-- Backward-compatible wrapper for callers passing 6 arguments
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
BEGIN
  RETURN public.create_guest_order(p_user_id, p_department_id, p_room_number, p_guest_name, p_notes, p_items, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- 5. Seed initial demo tables (Floor 1, Lake Terrace, Poolside)
INSERT INTO public.dining_tables (table_number, qr_token, section, capacity, status, pos_x, pos_y)
VALUES
  ('Table 01', 'tule-tbl-01-lakeview', 'Floor 1', 2, 'available', 15.0, 20.0),
  ('Table 02', 'tule-tbl-02-lakeview', 'Floor 1', 4, 'occupied', 35.0, 20.0),
  ('Table 03', 'tule-tbl-03-lakeview', 'Floor 1', 4, 'occupied', 55.0, 20.0),
  ('Table 04', 'tule-tbl-04-lakeview', 'Floor 1', 4, 'available', 75.0, 20.0),
  ('Table 05', 'tule-tbl-05-lakeview', 'Floor 1', 6, 'available', 85.0, 35.0),
  ('Table 06', 'tule-tbl-06-lakeview', 'Floor 1', 2, 'occupied', 15.0, 50.0),
  ('Table 07', 'tule-tbl-07-lakeview', 'Floor 1', 4, 'occupied', 35.0, 50.0),
  ('Table 08', 'tule-tbl-08-lakeview', 'Floor 1', 4, 'available', 55.0, 50.0),
  ('Table 09', 'tule-tbl-09-lakeview', 'Floor 1', 4, 'available', 75.0, 50.0),
  ('Table 10', 'tule-tbl-10-lakeview', 'Floor 1', 6, 'occupied', 85.0, 65.0),
  ('Table 11', 'tule-tbl-11-lakeview', 'Floor 1', 2, 'available', 15.0, 75.0),
  ('Table 12', 'tule-tbl-12-lakeview', 'Floor 1', 4, 'occupied', 35.0, 75.0),
  ('Table 13', 'tule-tbl-13-lakeview', 'Floor 1', 4, 'available', 55.0, 75.0),
  ('Table 14', 'tule-tbl-14-lakeview', 'Floor 1', 4, 'cleaning', 75.0, 75.0),
  ('Table 15', 'tule-tbl-15-lakeview', 'Floor 1', 8, 'occupied', 50.0, 90.0),

  -- Lake Terrace Tables
  ('Terrace 01', 'tule-tbl-t01-sunset', 'Lake Terrace', 4, 'available', 20.0, 25.0),
  ('Terrace 02', 'tule-tbl-t02-sunset', 'Lake Terrace', 4, 'occupied', 40.0, 25.0),
  ('Terrace 03', 'tule-tbl-t03-sunset', 'Lake Terrace', 2, 'occupied', 60.0, 25.0),
  ('Terrace 04', 'tule-tbl-t04-sunset', 'Lake Terrace', 6, 'available', 80.0, 25.0),
  ('Terrace 05', 'tule-tbl-t05-sunset', 'Lake Terrace', 4, 'available', 30.0, 65.0),
  ('Terrace 06', 'tule-tbl-t06-sunset', 'Lake Terrace', 4, 'cleaning', 70.0, 65.0),

  -- Poolside Tables
  ('Pool 01', 'tule-tbl-p01-breeze', 'Poolside', 2, 'available', 25.0, 40.0),
  ('Pool 02', 'tule-tbl-p02-breeze', 'Poolside', 4, 'occupied', 50.0, 40.0),
  ('Pool 03', 'tule-tbl-p03-breeze', 'Poolside', 4, 'available', 75.0, 40.0)
ON CONFLICT (table_number) DO NOTHING;

COMMIT;
