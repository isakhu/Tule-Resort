-- Migration 021: dining tables and QR-linked guest orders.
-- Additive and safe to rerun. Apply after migrations 001-020.

BEGIN;

CREATE TABLE IF NOT EXISTS public.dining_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL UNIQUE,
  label TEXT,
  section TEXT,
  capacity INTEGER CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 50),
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dining_table_id UUID REFERENCES public.dining_tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dining_tables_active ON public.dining_tables(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_dining_table_id ON public.orders(dining_table_id);

ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dining_tables_manager_all ON public.dining_tables;
CREATE POLICY dining_tables_manager_all ON public.dining_tables
  FOR ALL TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- Keep the existing six-argument order API backward-compatible while ensuring
-- the guest's name is stored as part of the order record.
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
  v_status_id INTEGER;
BEGIN
  IF p_department_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.departments d WHERE d.id = p_department_id
  ) THEN
    RAISE EXCEPTION 'Invalid order department';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  SELECT id INTO v_status_id
  FROM public.order_statuses
  WHERE name = 'Pending'
  LIMIT 1;
  IF v_status_id IS NULL THEN RAISE EXCEPTION 'Pending order status is not configured'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := NULLIF(v_item->>'menu_item_id', '')::UUID;
    v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 0);
    IF v_menu_item_id IS NULL OR v_quantity < 1 OR v_quantity > 50 THEN
      RAISE EXCEPTION 'Invalid order item or quantity';
    END IF;

    SELECT mi.price INTO v_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND COALESCE(mi.is_active, true) = true
      AND COALESCE(mi.is_available, true) = true;

    IF v_price IS NULL THEN RAISE EXCEPTION 'Menu item is unavailable'; END IF;
    v_total := v_total + (v_price * v_quantity);
  END LOOP;

  INSERT INTO public.orders
    (user_id, department_id, status_id, total, notes, room_number, guest_name)
  VALUES
    (p_user_id, p_department_id, v_status_id, v_total,
     NULLIF(trim(p_notes), ''), NULLIF(trim(p_room_number), ''),
     COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'))
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := NULLIF(v_item->>'menu_item_id', '')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    SELECT mi.price INTO v_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND COALESCE(mi.is_active, true) = true
      AND COALESCE(mi.is_available, true) = true;

    INSERT INTO public.order_items (order_id, menu_item_id, quantity, price)
    VALUES (v_order_id, v_menu_item_id, v_quantity, v_price);
  END LOOP;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- Separate RPC for QR-table orders. Invalid/inactive tokens fail closed and
-- cannot silently fall back to a room or unassigned order.
CREATE OR REPLACE FUNCTION public.create_guest_table_order(
  p_user_id UUID,
  p_department_id INTEGER,
  p_guest_name TEXT,
  p_notes TEXT,
  p_items JSONB,
  p_table_token TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_table_id UUID;
  v_total NUMERIC(10,2) := 0;
  v_item JSONB;
  v_menu_item_id UUID;
  v_quantity INTEGER;
  v_price NUMERIC(10,2);
  v_status_id INTEGER;
BEGIN
  IF p_table_token IS NULL OR length(trim(p_table_token)) < 32 THEN
    RAISE EXCEPTION 'Invalid table token';
  END IF;

  SELECT id INTO v_table_id
  FROM public.dining_tables
  WHERE qr_token = trim(p_table_token) AND is_active = true
  LIMIT 1;
  IF v_table_id IS NULL THEN RAISE EXCEPTION 'Table is unavailable'; END IF;

  IF p_department_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.departments d WHERE d.id = p_department_id
  ) THEN
    RAISE EXCEPTION 'Invalid order department';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  SELECT id INTO v_status_id
  FROM public.order_statuses
  WHERE name = 'Pending'
  LIMIT 1;
  IF v_status_id IS NULL THEN RAISE EXCEPTION 'Pending order status is not configured'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := NULLIF(v_item->>'menu_item_id', '')::UUID;
    v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 0);
    IF v_menu_item_id IS NULL OR v_quantity < 1 OR v_quantity > 50 THEN
      RAISE EXCEPTION 'Invalid order item or quantity';
    END IF;

    SELECT mi.price INTO v_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND COALESCE(mi.is_active, true) = true
      AND COALESCE(mi.is_available, true) = true;

    IF v_price IS NULL THEN RAISE EXCEPTION 'Menu item is unavailable'; END IF;
    v_total := v_total + (v_price * v_quantity);
  END LOOP;

  INSERT INTO public.orders
    (user_id, department_id, status_id, total, notes, room_number, guest_name, dining_table_id)
  VALUES
    (p_user_id, p_department_id, v_status_id, v_total,
     NULLIF(trim(p_notes), ''), NULL,
     COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'), v_table_id)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := NULLIF(v_item->>'menu_item_id', '')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    SELECT mi.price INTO v_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND COALESCE(mi.is_active, true) = true
      AND COALESCE(mi.is_available, true) = true;

    INSERT INTO public.order_items (order_id, menu_item_id, quantity, price)
    VALUES (v_order_id, v_menu_item_id, v_quantity, v_price);
  END LOOP;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_table_order(UUID, INTEGER, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_table_order(UUID, INTEGER, TEXT, TEXT, JSONB, TEXT) TO service_role;

COMMIT;
