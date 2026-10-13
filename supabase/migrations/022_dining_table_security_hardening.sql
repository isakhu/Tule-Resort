-- Migration 022: harden dining-table access and order validation.
-- Run after 021_dining_tables_and_qr_ordering.sql.
-- Existing table/menu data is preserved; only legacy predictable QR tokens rotate.

BEGIN;

-- Do not let anonymous clients enumerate every active QR token. Guests resolve
-- only the token they already scanned through the server-side lookup endpoint.
DROP POLICY IF EXISTS dining_tables_public_read ON public.dining_tables;
DROP POLICY IF EXISTS dining_tables_staff_all ON public.dining_tables;
DROP POLICY IF EXISTS dining_tables_manager_all ON public.dining_tables;
CREATE POLICY dining_tables_manager_all ON public.dining_tables
  FOR ALL TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- The original demo tokens are predictable. Rotate only those seeded values;
-- newly generated tokens use the column's cryptographically random default.
UPDATE public.dining_tables
SET qr_token = encode(gen_random_bytes(24), 'hex'),
    updated_at = now()
WHERE qr_token LIKE 'tule-tbl-%';

-- Ensure the seven-argument QR order RPC prices from current active AND
-- available menu records, and never accepts a missing/inactive table token.
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
  IF p_department_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.departments d WHERE d.id = p_department_id
  ) THEN
    RAISE EXCEPTION 'Invalid order department';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  IF p_table_token IS NOT NULL AND trim(p_table_token) <> '' THEN
    SELECT dt.id INTO v_table_id
    FROM public.dining_tables dt
    WHERE dt.qr_token = trim(p_table_token) AND dt.is_active = true
    LIMIT 1;
    IF v_table_id IS NULL THEN RAISE EXCEPTION 'Invalid or deactivated dining table QR code'; END IF;
  END IF;

  SELECT id INTO v_status_id
  FROM public.order_statuses WHERE name = 'Pending' LIMIT 1;
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

  INSERT INTO public.orders (
    user_id, department_id, status_id, total, notes, room_number, guest_name, dining_table_id
  )
  VALUES (
    p_user_id, p_department_id, v_status_id, v_total,
    NULLIF(trim(p_notes), ''),
    CASE WHEN v_table_id IS NOT NULL THEN NULL ELSE NULLIF(trim(p_room_number), '') END,
    COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'),
    v_table_id
  )
  RETURNING id INTO v_order_id;

  IF v_table_id IS NOT NULL THEN
    UPDATE public.dining_tables
    SET status = 'occupied', updated_at = now()
    WHERE id = v_table_id AND status = 'available';
  END IF;

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

REVOKE ALL ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT) TO service_role;

COMMIT;
