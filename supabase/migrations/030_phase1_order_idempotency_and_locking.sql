-- Migration: 030_phase1_order_idempotency_and_locking.sql
-- Description: Phase 1 Order Creation Security, Race-Safe Idempotency, and Pessimistic+Optimistic State Locking
--
-- 1. Add idempotency_key column and unique constraint on public.orders.
-- 2. Upgrade public.create_guest_order with race-safe atomic idempotency and strict server-side price calculation.
-- 3. Upgrade public.update_entity_status with row-level locking (FOR UPDATE) and optimistic concurrency conflict detection (STATE_CONFLICT).
-- 4. Upgrade public.cancel_guest_item with row-level locking (FOR UPDATE) and optimistic validation against Pending status.

BEGIN;

-- ============================================================================
-- 1. Idempotency Key on public.orders
-- ============================================================================
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_idempotency_key_key' AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_idempotency_key_key UNIQUE (idempotency_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key);

-- ============================================================================
-- 2. Race-Safe Idempotent create_guest_order RPC
-- ============================================================================
-- Drop existing variations safely
DROP FUNCTION IF EXISTS public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_user_id UUID,
  p_department_id INTEGER,
  p_room_number TEXT,
  p_guest_name TEXT,
  p_notes TEXT,
  p_items JSONB,
  p_table_token TEXT DEFAULT NULL,
  p_session_token TEXT DEFAULT NULL,
  p_guest_stay_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  total_amount NUMERIC(10,2),
  is_duplicate BOOLEAN
)
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
  v_table_id UUID;
  v_table_status TEXT;
  v_table_session_id UUID;
  v_item_department_id INTEGER;
  v_department_id INTEGER := p_department_id;
  v_clean_key TEXT := NULLIF(trim(p_idempotency_key), '');
  v_existing_id UUID;
  v_existing_total NUMERIC(10,2);
BEGIN
  -- 0. Fast pre-check for idempotency key
  IF v_clean_key IS NOT NULL THEN
    SELECT o.id, o.total
    INTO v_existing_id, v_existing_total
    FROM public.orders o
    WHERE o.idempotency_key = v_clean_key
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY SELECT v_existing_id, v_existing_total, TRUE;
      RETURN;
    END IF;
  END IF;

  -- 1. Basic validation
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  -- 2. Validate table token and enforce table status if ordering for a table
  IF p_table_token IS NOT NULL AND trim(p_table_token) <> '' THEN
    SELECT dt.id, dt.status
    INTO v_table_id, v_table_status
    FROM public.dining_tables dt
    WHERE (dt.qr_token = trim(p_table_token) OR dt.id::text = trim(p_table_token))
      AND dt.is_active = true
    LIMIT 1;

    IF v_table_id IS NULL THEN
      RAISE EXCEPTION 'Invalid or deactivated dining table QR code';
    END IF;

    IF v_table_status = 'out_of_service' THEN
      RAISE EXCEPTION 'Table is currently out of service';
    END IF;

    IF v_table_status = 'cleaning' THEN
      RAISE EXCEPTION 'Table is currently being sanitized. Please wait.';
    END IF;

    -- If table is occupied, verify session token
    IF v_table_status = 'occupied' THEN
      IF p_session_token IS NOT NULL AND trim(p_session_token) <> '' THEN
        SELECT ts.id
        INTO v_table_session_id
        FROM public.table_sessions ts
        WHERE ts.table_id = v_table_id
          AND ts.session_token = trim(p_session_token)
          AND ts.status = 'active'
        LIMIT 1;

        IF v_table_session_id IS NULL THEN
          RAISE EXCEPTION 'Table is currently occupied by another session';
        END IF;
      ELSE
        -- Auto-find active session if table is occupied
        SELECT ts.id
        INTO v_table_session_id
        FROM public.table_sessions ts
        WHERE ts.table_id = v_table_id
          AND ts.status = 'active'
        ORDER BY ts.opened_at DESC
        LIMIT 1;
      END IF;
    ELSIF v_table_status = 'available' THEN
      -- Create a new active table session
      INSERT INTO public.table_sessions (
        table_id,
        session_token,
        status,
        guest_name,
        guest_stay_id
      ) VALUES (
        v_table_id,
        COALESCE(NULLIF(trim(p_session_token), ''), encode(gen_random_bytes(16), 'hex')),
        'active',
        COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'),
        p_guest_stay_id
      )
      RETURNING id INTO v_table_session_id;

      UPDATE public.dining_tables
      SET status = 'occupied', updated_at = now()
      WHERE id = v_table_id;
    END IF;
  END IF;

  -- 3. Resolve default Pending status (id = 1)
  SELECT id
  INTO v_status_id
  FROM public.order_statuses
  WHERE lower(name) = 'pending'
  LIMIT 1;

  IF v_status_id IS NULL THEN
    v_status_id := 1;
  END IF;

  -- 4. Calculate verified total strictly from menu_items and check availability
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := trim(COALESCE(v_item->>'menu_item_id', v_item->>'menuItemId', ''))::UUID;
    v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 0);

    IF v_menu_item_id IS NULL OR v_quantity < 1 OR v_quantity > 50 THEN
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

    IF v_department_id IS NULL AND v_item_department_id IS NOT NULL THEN
      v_department_id := v_item_department_id;
    END IF;

    v_total := v_total + (v_price * v_quantity);
  END LOOP;

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

  -- 5. Race-Safe Atomic Insert into public.orders
  BEGIN
    INSERT INTO public.orders (
      user_id,
      department_id,
      status_id,
      total,
      notes,
      room_number,
      guest_name,
      dining_table_id,
      table_session_id,
      guest_stay_id,
      idempotency_key
    ) VALUES (
      p_user_id,
      v_department_id,
      v_status_id,
      v_total,
      NULLIF(trim(p_notes), ''),
      NULLIF(trim(p_room_number), ''),
      COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'),
      v_table_id,
      v_table_session_id,
      p_guest_stay_id,
      v_clean_key
    )
    RETURNING id INTO v_order_id;
  EXCEPTION WHEN unique_violation THEN
    -- If a concurrent worker inserted with the exact same idempotency_key:
    IF v_clean_key IS NOT NULL THEN
      SELECT o.id, o.total
      INTO v_existing_id, v_existing_total
      FROM public.orders o
      WHERE o.idempotency_key = v_clean_key
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        RETURN QUERY SELECT v_existing_id, v_existing_total, TRUE;
        RETURN;
      END IF;
    END IF;
    RAISE;
  END;

  -- 6. Insert order items
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := trim(COALESCE(v_item->>'menu_item_id', v_item->>'menuItemId', ''))::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT mi.price
    INTO v_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id;

    INSERT INTO public.order_items (
      order_id,
      menu_item_id,
      quantity,
      price
    ) VALUES (
      v_order_id,
      v_menu_item_id,
      v_quantity,
      v_price
    );
  END LOOP;

  -- 7. Record initial Pending status in status_history
  INSERT INTO public.status_history (
    entity_type,
    entity_id,
    from_status_id,
    to_status_id,
    changed_by,
    notes
  ) VALUES (
    'order',
    v_order_id,
    NULL,
    v_status_id,
    'guest',
    'Order placed by guest'
  );

  RETURN QUERY SELECT v_order_id, v_total, FALSE;
END;
$$;

-- Grant execution
GRANT EXECUTE ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT) TO authenticated, anon;

-- ============================================================================
-- 3. Pessimistic + Optimistic update_entity_status RPC
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_entity_status(TEXT, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.update_entity_status(TEXT, UUID, INTEGER, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.update_entity_status(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_to_status_id INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_expected_status_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_status_id INTEGER;
  v_department_id INTEGER;
  v_valid_transition BOOLEAN := FALSE;
  v_changed_by UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF p_entity_type NOT IN ('order', 'service_request') THEN
    RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.order_statuses WHERE id = p_to_status_id) THEN
    RAISE EXCEPTION 'Target status % does not exist', p_to_status_id;
  END IF;

  -- 1) Fetch current status and department WITH ROW LOCK (FOR UPDATE)
  IF p_entity_type = 'order' THEN
    SELECT status_id, department_id
    INTO v_from_status_id, v_department_id
    FROM public.orders
    WHERE id = p_entity_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order % not found', p_entity_id;
    END IF;
  ELSIF p_entity_type = 'service_request' THEN
    SELECT status_id, department_id
    INTO v_from_status_id, v_department_id
    FROM public.service_requests
    WHERE id = p_entity_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service request % not found', p_entity_id;
    END IF;
  END IF;

  -- 2) Check Optimistic Locking expected status
  IF p_expected_status_id IS NOT NULL AND v_from_status_id <> p_expected_status_id THEN
    RAISE EXCEPTION 'STATE_CONFLICT: Expected status %, but current status is %', p_expected_status_id, v_from_status_id;
  END IF;

  -- 3) Check permissions: user must have department access or be manager/admin
  IF v_changed_by IS NOT NULL THEN
    IF NOT (public.is_manager_or_admin() OR public.has_department_access(v_department_id)) THEN
      RAISE EXCEPTION 'User not authorized to update status for department %', v_department_id;
    END IF;
  END IF;

  -- 4) Validate transition graph
  -- 1: Pending, 2: Confirmed, 3: Preparing, 4: Ready, 5: Delivered, 6: Completed, 7: Accepted, 8: In Progress, 9: Cancelled
  IF v_from_status_id = p_to_status_id THEN
    -- No-op transition
    v_valid_transition := TRUE;
  ELSIF v_from_status_id IN (1) THEN -- Pending
    v_valid_transition := p_to_status_id IN (7, 2, 8, 3, 9); -- -> Accepted, Confirmed, In Progress, Preparing, Cancelled
  ELSIF v_from_status_id IN (7, 2) THEN -- Accepted / Confirmed
    v_valid_transition := p_to_status_id IN (8, 3, 4, 9); -- -> In Progress, Preparing, Ready, Cancelled
  ELSIF v_from_status_id IN (8, 3) THEN -- In Progress / Preparing
    v_valid_transition := p_to_status_id IN (4, 6, 9); -- -> Ready, Completed, Cancelled
  ELSIF v_from_status_id IN (4) THEN -- Ready
    v_valid_transition := p_to_status_id IN (5, 6, 9); -- -> Delivered, Completed, Cancelled
  ELSIF v_from_status_id IN (5) THEN -- Delivered
    v_valid_transition := p_to_status_id IN (6); -- -> Completed
  ELSIF v_from_status_id IN (6, 9) THEN -- Completed / Cancelled (Terminal)
    v_valid_transition := FALSE;
  ELSE
    v_valid_transition := TRUE;
  END IF;

  -- Allow managers/admins to override invalid graph steps if needed
  IF NOT v_valid_transition AND public.is_manager_or_admin() THEN
    v_valid_transition := TRUE;
  END IF;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid status transition from % to % for %', v_from_status_id, p_to_status_id, p_entity_type;
  END IF;

  -- 5) Apply atomic update
  IF p_entity_type = 'order' THEN
    UPDATE public.orders
    SET status_id = p_to_status_id, updated_at = now()
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'service_request' THEN
    UPDATE public.service_requests
    SET status_id = p_to_status_id, updated_at = now()
    WHERE id = p_entity_id;
  END IF;

  -- 6) Log to status_history
  INSERT INTO public.status_history (
    entity_type,
    entity_id,
    from_status_id,
    to_status_id,
    changed_by,
    notes
  )
  VALUES (
    p_entity_type,
    p_entity_id,
    v_from_status_id,
    p_to_status_id,
    v_changed_by,
    p_notes
  );

  -- 7) Send notification to department
  INSERT INTO public.notifications (
    department_id,
    payload
  )
  VALUES (
    v_department_id,
    jsonb_build_object(
      'event', 'status_changed',
      'entity_type', p_entity_type,
      'entity_id', p_entity_id,
      'from_status_id', v_from_status_id,
      'to_status_id', p_to_status_id,
      'notes', p_notes,
      'changed_at', now()
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'from_status_id', v_from_status_id,
    'to_status_id', p_to_status_id
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_entity_status(TEXT, UUID, INTEGER, TEXT, INTEGER) TO authenticated;

-- ============================================================================
-- 4. Race-Safe cancel_guest_item RPC with Row-Locking
-- ============================================================================
DROP FUNCTION IF EXISTS public.cancel_guest_item(TEXT, UUID, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.cancel_guest_item(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_guest_stay_id UUID DEFAULT NULL,
  p_room_number TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'Cancelled by guest'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancelled_status_id INTEGER;
  v_order RECORD;
  v_request RECORD;
BEGIN
  -- Resolve Cancelled status ID
  SELECT id INTO v_cancelled_status_id
  FROM public.order_statuses
  WHERE lower(name) = 'cancelled'
  LIMIT 1;

  IF v_cancelled_status_id IS NULL THEN
    v_cancelled_status_id := 9;
  END IF;

  IF lower(trim(p_entity_type)) = 'order' THEN
    -- Lock target order row
    SELECT id, status_id, guest_stay_id, room_number
    INTO v_order
    FROM public.orders
    WHERE id = p_entity_id
    FOR UPDATE;

    IF v_order.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
    END IF;

    -- Strict check: ONLY status_id = 1 (Pending) can be cancelled
    IF v_order.status_id <> 1 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'STATE_CONFLICT: Order has already started preparation and cannot be cancelled.'
      );
    END IF;

    -- Verification check if stay ID was passed
    IF p_guest_stay_id IS NOT NULL AND v_order.guest_stay_id IS NOT NULL AND v_order.guest_stay_id <> p_guest_stay_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to cancel this order.');
    END IF;

    -- Update order to Cancelled
    UPDATE public.orders
    SET status_id = v_cancelled_status_id,
        updated_at = now()
    WHERE id = p_entity_id;

    -- Log transition in status_history
    INSERT INTO public.status_history (
      entity_type,
      entity_id,
      from_status_id,
      to_status_id,
      changed_by,
      notes
    ) VALUES (
      'order',
      p_entity_id,
      v_order.status_id,
      v_cancelled_status_id,
      'guest',
      COALESCE(p_reason, 'Cancelled by guest')
    );

    RETURN jsonb_build_object('success', true, 'message', 'Order cancelled successfully.');

  ELSIF lower(trim(p_entity_type)) IN ('service_request', 'request') THEN
    -- Lock target request row
    SELECT id, status_id, guest_stay_id, room_number
    INTO v_request
    FROM public.service_requests
    WHERE id = p_entity_id
    FOR UPDATE;

    IF v_request.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Service request not found.');
    END IF;

    -- Strict check: ONLY status_id = 1 (Pending) can be cancelled
    IF v_request.status_id <> 1 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'STATE_CONFLICT: Service request has already been accepted or started and cannot be cancelled.'
      );
    END IF;

    -- Verification check if stay ID was passed
    IF p_guest_stay_id IS NOT NULL AND v_request.guest_stay_id IS NOT NULL AND v_request.guest_stay_id <> p_guest_stay_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to cancel this request.');
    END IF;

    -- Update request to Cancelled
    UPDATE public.service_requests
    SET status_id = v_cancelled_status_id,
        updated_at = now()
    WHERE id = p_entity_id;

    -- Log transition in status_history
    INSERT INTO public.status_history (
      entity_type,
      entity_id,
      from_status_id,
      to_status_id,
      changed_by,
      notes
    ) VALUES (
      'service_request',
      p_entity_id,
      v_request.status_id,
      v_cancelled_status_id,
      'guest',
      COALESCE(p_reason, 'Cancelled by guest')
    );

    RETURN jsonb_build_object('success', true, 'message', 'Service request cancelled successfully.');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid entity type.');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_guest_item(TEXT, UUID, UUID, TEXT, TEXT) TO authenticated, anon;

COMMIT;
