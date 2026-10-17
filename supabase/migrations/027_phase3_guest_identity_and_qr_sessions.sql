-- Phase 3: Guest Identity, Stay Sessions, QR Table Sessions and Live Tracking
-- 1. Create table_sessions to track active dining table sessions
-- 2. Add table_session_id and guest_stay_id to orders
-- 3. Randomize QR tokens and add regeneration function
-- 4. Create verify_guest_stay function (room number + booking number / last name)
-- 5. Create cancel_guest_item function (enforce cancel ONLY when status is Pending)
-- 6. Create get_or_create_table_session function (enforce table availability / occupied check)
-- 7. Update create_guest_order to link session and stay, enforcing table status
-- 8. Enable RLS and Realtime on table_sessions

BEGIN;

-- 1. Dining Table Sessions table
CREATE TABLE IF NOT EXISTS public.table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.dining_tables(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  guest_name TEXT,
  guest_phone TEXT,
  guest_stay_id UUID REFERENCES public.room_reservations(id) ON DELETE SET NULL,
  party_size INTEGER NOT NULL DEFAULT 1 CHECK (party_size > 0),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_sessions_token ON public.table_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_status ON public.table_sessions(table_id, status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_stay ON public.table_sessions(guest_stay_id);

-- 2. Add columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_session_id UUID REFERENCES public.table_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_stay_id UUID REFERENCES public.room_reservations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_table_session_id ON public.orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_stay_id ON public.orders(guest_stay_id);
CREATE INDEX IF NOT EXISTS idx_orders_room_number ON public.orders(room_number);

-- 3. Randomize existing predictable dining table QR tokens
UPDATE public.dining_tables
SET qr_token = encode(gen_random_bytes(16), 'hex'),
    updated_at = now()
WHERE qr_token LIKE 'tule-tbl-%' OR qr_token IS NULL OR length(qr_token) < 16;

-- Helper to regenerate a table's QR token
CREATE OR REPLACE FUNCTION public.regenerate_table_qr_token(p_table_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token TEXT;
BEGIN
  v_new_token := encode(gen_random_bytes(16), 'hex');
  UPDATE public.dining_tables
  SET qr_token = v_new_token,
      updated_at = now()
  WHERE id = p_table_id;

  RETURN v_new_token;
END;
$$;

-- 4. Verify Guest Stay RPC: room number + booking number or last name
CREATE OR REPLACE FUNCTION public.verify_guest_stay(
  p_room_identifier TEXT,
  p_verification TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay RECORD;
  v_clean_room TEXT;
  v_clean_verif TEXT;
BEGIN
  v_clean_room := trim(COALESCE(p_room_identifier, ''));
  v_clean_verif := trim(COALESCE(p_verification, ''));

  IF v_clean_room = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room number or name is required.');
  END IF;

  IF v_clean_verif = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking number or last name is required.');
  END IF;

  SELECT
    r.id,
    r.booking_number,
    r.guest_name,
    r.guest_phone,
    r.guest_email,
    r.check_in,
    r.check_out,
    r.status,
    r.room_id,
    rm.name AS room_name
  INTO v_stay
  FROM public.room_reservations r
  JOIN public.rooms rm ON rm.id = r.room_id
  WHERE r.status = 'checked_in'
    AND (
      rm.name ILIKE '%' || v_clean_room || '%'
      OR (v_clean_room ~ '^[0-9]+$' AND rm.name ~ ('\m' || v_clean_room || '\M'))
    )
    AND (
      r.booking_number ILIKE '%' || v_clean_verif || '%'
      OR r.guest_name ILIKE '%' || v_clean_verif || '%'
    )
  ORDER BY r.check_in DESC
  LIMIT 1;

  IF v_stay.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active checked-in stay found matching this room and booking number or name.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'stay', jsonb_build_object(
      'id', v_stay.id,
      'booking_number', v_stay.booking_number,
      'guest_name', v_stay.guest_name,
      'guest_phone', v_stay.guest_phone,
      'guest_email', v_stay.guest_email,
      'room_id', v_stay.room_id,
      'room_name', v_stay.room_name,
      'check_in', v_stay.check_in,
      'check_out', v_stay.check_out,
      'status', v_stay.status
    )
  );
END;
$$;

-- 5. Cancel Guest Item RPC: Enforces cancel ONLY while status is Pending (id = 1)
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
    SELECT id, status_id, guest_stay_id, room_number
    INTO v_order
    FROM public.orders
    WHERE id = p_entity_id;

    IF v_order.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
    END IF;

    -- Strict check: ONLY status_id = 1 (Pending) can be cancelled
    IF v_order.status_id <> 1 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Order cannot be cancelled because it is already being prepared or completed by the team.'
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
    SELECT id, status_id, guest_stay_id, room_number
    INTO v_request
    FROM public.service_requests
    WHERE id = p_entity_id;

    IF v_request.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Service request not found.');
    END IF;

    -- Strict check: ONLY status_id = 1 (Pending) can be cancelled
    IF v_request.status_id <> 1 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service request cannot be cancelled because it has already been accepted or is in progress.'
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

-- 6. Table Session Management RPC: Enforces table status & session ownership
CREATE OR REPLACE FUNCTION public.get_or_create_table_session(
  p_table_token TEXT,
  p_guest_name TEXT DEFAULT NULL,
  p_existing_session_token TEXT DEFAULT NULL,
  p_guest_stay_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table RECORD;
  v_session RECORD;
  v_new_session_token TEXT;
  v_session_id UUID;
BEGIN
  IF p_table_token IS NULL OR trim(p_table_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Table token is required.');
  END IF;

  -- 1. Find table by qr_token or ID
  SELECT id, table_number, section, capacity, status, is_active
  INTO v_table
  FROM public.dining_tables
  WHERE (qr_token = trim(p_table_token) OR id::text = trim(p_table_token))
    AND is_active = true
  LIMIT 1;

  IF v_table.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Table QR code is invalid or deactivated.');
  END IF;

  -- 2. Check table availability
  IF v_table.status = 'out_of_service' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This table is currently out of service. Please choose another table or speak to resort staff.',
      'table_status', v_table.status
    );
  END IF;

  IF v_table.status = 'cleaning' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Table ' || v_table.table_number || ' is currently being sanitized and prepared. Please check back in a few minutes.',
      'table_status', v_table.status
    );
  END IF;

  -- 3. If table is occupied, check if the caller owns the active session
  IF v_table.status = 'occupied' THEN
    IF p_existing_session_token IS NOT NULL AND trim(p_existing_session_token) <> '' THEN
      SELECT id, session_token, status, guest_name, guest_stay_id, opened_at
      INTO v_session
      FROM public.table_sessions
      WHERE table_id = v_table.id
        AND session_token = trim(p_existing_session_token)
        AND status = 'active'
      LIMIT 1;

      IF v_session.id IS NOT NULL THEN
        RETURN jsonb_build_object(
          'success', true,
          'is_new', false,
          'session', jsonb_build_object(
            'id', v_session.id,
            'session_token', v_session.session_token,
            'guest_name', v_session.guest_name,
            'opened_at', v_session.opened_at
          ),
          'table', jsonb_build_object(
            'id', v_table.id,
            'table_number', v_table.table_number,
            'section', v_table.section,
            'status', v_table.status
          )
        );
      END IF;
    END IF;

    -- Table is occupied and no matching session token provided
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Table ' || v_table.table_number || ' is currently occupied by another party. Please speak to staff to be seated or open a new session.',
      'table_status', 'occupied'
    );
  END IF;

  -- 4. Table is available: Start or attach active session
  v_new_session_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.table_sessions (
    table_id,
    session_token,
    status,
    guest_name,
    guest_stay_id,
    opened_at
  ) VALUES (
    v_table.id,
    v_new_session_token,
    'active',
    COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'),
    p_guest_stay_id,
    now()
  )
  RETURNING id INTO v_session_id;

  -- Update table status to occupied
  UPDATE public.dining_tables
  SET status = 'occupied',
      updated_at = now()
  WHERE id = v_table.id;

  RETURN jsonb_build_object(
    'success', true,
    'is_new', true,
    'session', jsonb_build_object(
      'id', v_session_id,
      'session_token', v_new_session_token,
      'guest_name', COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'),
      'opened_at', now()
    ),
    'table', jsonb_build_object(
      'id', v_table.id,
      'table_number', v_table.table_number,
      'section', v_table.section,
      'status', 'occupied'
    )
  );
END;
$$;

-- 7. Update create_guest_order to link table session and stay, and enforce availability
DROP FUNCTION IF EXISTS public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_user_id UUID,
  p_department_id INTEGER,
  p_room_number TEXT,
  p_guest_name TEXT,
  p_notes TEXT,
  p_items JSONB,
  p_table_token TEXT DEFAULT NULL,
  p_session_token TEXT DEFAULT NULL,
  p_guest_stay_id UUID DEFAULT NULL
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
  v_table_id UUID;
  v_table_status TEXT;
  v_table_session_id UUID;
  v_item_department_id INTEGER;
  v_department_id INTEGER := p_department_id;
BEGIN
  -- Basic validation
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  -- Validate table token and enforce status if ordering for a table
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

  -- Resolve default Pending status (id = 1)
  SELECT id
  INTO v_status_id
  FROM public.order_statuses
  WHERE lower(name) = 'pending'
  LIMIT 1;

  IF v_status_id IS NULL THEN
    v_status_id := 1;
  END IF;

  -- Calculate verified total and derive department
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

  -- Insert order
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
    guest_stay_id
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
    p_guest_stay_id
  )
  RETURNING id INTO v_order_id;

  -- Insert order items
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

  -- Record initial Pending status in status_history
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

  RETURN v_order_id;
END;
$$;

-- 8. Enable RLS and Policies on table_sessions
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS table_sessions_public_read ON public.table_sessions;
CREATE POLICY table_sessions_public_read ON public.table_sessions
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS table_sessions_public_insert ON public.table_sessions;
CREATE POLICY table_sessions_public_insert ON public.table_sessions
  FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS table_sessions_staff_manage ON public.table_sessions;
CREATE POLICY table_sessions_staff_manage ON public.table_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND lower(r.name) IN ('admin', 'manager', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND lower(r.name) IN ('admin', 'manager', 'staff')
    )
  );

-- 9. Add table_sessions to Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'table_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.table_sessions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 10. Seed a demo room and checked-in reservation if none exists for instant testing
DO $$
DECLARE
  v_demo_room_id UUID;
  v_has_checked_in BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.room_reservations WHERE status = 'checked_in'
  ) INTO v_has_checked_in;

  IF NOT v_has_checked_in THEN
    -- Ensure at least one room exists
    SELECT id INTO v_demo_room_id FROM public.rooms WHERE is_active = true LIMIT 1;
    
    IF v_demo_room_id IS NULL THEN
      INSERT INTO public.rooms (
        name,
        type,
        category,
        description,
        price_per_night,
        capacity,
        is_active,
        is_available
      ) VALUES (
        'Room 101 - Lake View Villa',
        'Deluxe',
        'Accommodation',
        'Luxury lake-front villa with private balcony and scenic Hawassa views.',
        4500,
        2,
        true,
        true
      )
      RETURNING id INTO v_demo_room_id;
    END IF;

    -- Insert a sample checked-in reservation
    INSERT INTO public.room_reservations (
      booking_number,
      room_id,
      guest_name,
      guest_phone,
      guest_email,
      check_in,
      check_out,
      guests,
      total_price,
      currency,
      payment_method,
      status
    ) VALUES (
      'TUL-DEMO101',
      v_demo_room_id,
      'Sara Bekele',
      '+251911223344',
      'sara.bekele@example.com',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '3 days',
      2,
      13500.00,
      'ETB',
      'pay_at_resort',
      'checked_in'
    );
  END IF;
END $$;

COMMIT;
