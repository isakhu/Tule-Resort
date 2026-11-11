-- Migration: 034_phase5_p1b_transaction_fixes.sql
-- Description: P1B Transaction & Database Integrity Fixes
--
-- 1. Task 1: Unify room reservation pricing with resort_settings (service charge & tax),
--    store breakdown on room_reservations, and avoid double-taxing room charges at check-in.
-- 2. Task 2: Reconcile prepaid reservation deposits in calculate_folio & checkout_and_generate_receipt,
--    attribute authenticated staff processor, guard in-flight items & invalid statuses, and enforce
--    idempotent unique source charges.
-- 3. Task 3: Fix dining table UUID vs qr_token casts, enforce 6-hour expired session cleanup on
--    session retrieval and order placement, and lock dining_tables row during session opening.
-- 4. Task 4: Remove literal 'guest' inserts into UUID column status_history.changed_by in
--    create_guest_order and cancel_guest_item without weakening attribution or altering column types.
-- 5. Task 5: Drop stale update_entity_status overloads (including 028's 5-arg TEXT overload) and
--    restore automatic folio posting on Completed (status_id = 6) inside 031's hardened RBAC/locking RPC.

BEGIN;

-- ============================================================================
-- 1. Schema Extensions for Transparent Pricing Breakdown & Prepaid Accounting
-- ============================================================================

ALTER TABLE public.room_reservations
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.resort_receipts
  ADD COLUMN IF NOT EXISTS prepaid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Remove any duplicate auto-posted source rows before enforcing idempotent unique index
DELETE FROM public.charges a
USING public.charges b
WHERE a.id > b.id
  AND a.stay_id = b.stay_id
  AND a.source_type = b.source_type
  AND a.source_id IS NOT NULL
  AND a.source_id = b.source_id
  AND a.source_type IN ('room', 'order', 'service_request');

CREATE UNIQUE INDEX IF NOT EXISTS idx_charges_unique_source
  ON public.charges (stay_id, source_type, source_id)
  WHERE source_id IS NOT NULL
    AND source_type IN ('room', 'order', 'service_request');

-- ============================================================================
-- 2. Task 1: Unified Pricing in create_room_reservation & Check-in Trigger
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_room_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_room_reservation(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_guests INTEGER,
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_guest_email TEXT DEFAULT NULL,
  p_special_requests TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  booking_number TEXT,
  subtotal NUMERIC,
  service_charge_percent NUMERIC,
  service_charge NUMERIC,
  tax_percent NUMERIC,
  tax NUMERIC,
  total_price NUMERIC,
  currency TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room RECORD;
  v_nights INTEGER;
  v_rate NUMERIC(12,2);
  v_subtotal NUMERIC(12,2);
  v_service_pct NUMERIC(5,2) := 0;
  v_tax_pct NUMERIC(5,2) := 0;
  v_service_charge NUMERIC(12,2) := 0;
  v_tax NUMERIC(12,2) := 0;
  v_total NUMERIC(12,2);
  v_currency TEXT := 'ETB';
BEGIN
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Check-out must be after check-in.';
  END IF;

  IF p_guests IS NULL OR p_guests < 1 THEN
    RAISE EXCEPTION 'Guests must be at least 1.';
  END IF;

  IF p_guest_name IS NULL OR length(trim(p_guest_name)) < 2 THEN
    RAISE EXCEPTION 'Guest name is required.';
  END IF;

  IF p_guest_phone IS NULL OR length(trim(p_guest_phone)) < 5 THEN
    RAISE EXCEPTION 'Guest phone is required.';
  END IF;

  SELECT
    r.id,
    r.name,
    COALESCE(r.price_per_night, r.base_price, 0) AS nightly_rate,
    r.capacity,
    r.is_active,
    r.is_available
  INTO v_room
  FROM public.rooms r
  WHERE r.id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.';
  END IF;

  IF NOT v_room.is_active OR NOT v_room.is_available THEN
    RAISE EXCEPTION 'This room is currently unavailable for booking.';
  END IF;

  IF p_guests > COALESCE(v_room.capacity, 0) THEN
    RAISE EXCEPTION 'This room allows up to % guests.', v_room.capacity;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.room_reservations rr
    WHERE rr.room_id = p_room_id
      AND rr.status IN ('pending', 'confirmed', 'checked_in')
      AND rr.check_in < p_check_out
      AND rr.check_out > p_check_in
  ) THEN
    RAISE EXCEPTION 'This room is already booked for those dates. Please choose different dates.';
  END IF;

  -- Load resort pricing rules identically to calculate_folio
  SELECT
    COALESCE(rs.service_charge_percent, 0),
    COALESCE(rs.tax_percent, 0),
    COALESCE(NULLIF(trim(rs.default_currency), ''), 'ETB')
  INTO v_service_pct, v_tax_pct, v_currency
  FROM public.resort_settings rs
  WHERE rs.id = true
  LIMIT 1;

  IF NOT FOUND THEN
    v_service_pct := 0;
    v_tax_pct := 0;
    v_currency := 'ETB';
  END IF;

  v_nights := p_check_out - p_check_in;
  v_rate := COALESCE(v_room.nightly_rate, 0);
  v_subtotal := ROUND(v_rate * v_nights, 2);
  v_service_charge := ROUND(v_subtotal * (v_service_pct / 100.0), 2);
  v_tax := ROUND((v_subtotal + v_service_charge) * (v_tax_pct / 100.0), 2);
  v_total := v_subtotal + v_service_charge + v_tax;

  INSERT INTO public.room_reservations (
    room_id,
    user_id,
    guest_name,
    guest_phone,
    guest_email,
    check_in,
    check_out,
    guests,
    subtotal,
    service_charge_percent,
    service_charge,
    tax_percent,
    tax,
    total_price,
    currency,
    status,
    payment_method,
    payment_status,
    special_requests
  )
  VALUES (
    v_room.id,
    p_user_id,
    trim(p_guest_name),
    trim(p_guest_phone),
    NULLIF(trim(p_guest_email), ''),
    p_check_in,
    p_check_out,
    p_guests,
    v_subtotal,
    v_service_pct,
    v_service_charge,
    v_tax_pct,
    v_tax,
    v_total,
    v_currency,
    'pending',
    'pay_at_resort',
    'pending',
    NULLIF(trim(p_special_requests), '')
  )
  RETURNING
    room_reservations.id,
    room_reservations.booking_number,
    room_reservations.subtotal,
    room_reservations.service_charge_percent,
    room_reservations.service_charge,
    room_reservations.tax_percent,
    room_reservations.tax,
    room_reservations.total_price,
    room_reservations.currency,
    room_reservations.status
  INTO
    id,
    booking_number,
    subtotal,
    service_charge_percent,
    service_charge,
    tax_percent,
    tax,
    total_price,
    currency,
    status;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_room_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_room_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated, service_role;

-- Post pre-tax room subtotal on check-in so calculate_folio adds service charge & tax once consistently
CREATE OR REPLACE FUNCTION public.post_room_check_in_charge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nights INTEGER;
  v_room_name TEXT;
  v_nightly_price NUMERIC(12,2);
  v_room_subtotal NUMERIC(12,2);
BEGIN
  IF NEW.status = 'checked_in' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'checked_in') THEN
    v_nights := GREATEST(1, (NEW.check_out - NEW.check_in));

    SELECT rm.name, COALESCE(rm.price_per_night, rm.base_price, 0)
    INTO v_room_name, v_nightly_price
    FROM public.rooms rm
    WHERE rm.id = NEW.room_id;

    v_room_subtotal := COALESCE(
      NEW.subtotal,
      CASE
        WHEN COALESCE(v_nightly_price, 0) > 0 THEN ROUND(v_nightly_price * v_nights, 2)
        ELSE COALESCE(NEW.total_price, 0)
      END
    );

    INSERT INTO public.charges (
      stay_id,
      source_type,
      source_id,
      description,
      quantity,
      unit_price,
      amount,
      posted_at
    ) VALUES (
      NEW.id,
      'room',
      NEW.id,
      'Room Accommodation (' || v_nights || ' night' || CASE WHEN v_nights > 1 THEN 's' ELSE '' END || ') - ' || COALESCE(v_room_name, 'Room'),
      v_nights,
      ROUND(v_room_subtotal / v_nights, 2),
      v_room_subtotal,
      now()
    )
    ON CONFLICT (stay_id, source_type, source_id)
    WHERE source_id IS NOT NULL AND source_type IN ('room', 'order', 'service_request')
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Task 1 & 2: calculate_folio & checkout_and_generate_receipt Reconciliation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_folio(p_stay_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay RECORD;
  v_subtotal NUMERIC(12,2) := 0;
  v_service_pct NUMERIC(5,2) := 0;
  v_tax_pct NUMERIC(5,2) := 0;
  v_service_charge NUMERIC(12,2) := 0;
  v_tax NUMERIC(12,2) := 0;
  v_total NUMERIC(12,2) := 0;
  v_prepaid_amount NUMERIC(12,2) := 0;
  v_balance_due NUMERIC(12,2) := 0;
  v_currency TEXT := 'ETB';
  v_charges_json JSONB;
BEGIN
  SELECT
    r.id,
    r.booking_number,
    r.guest_name,
    r.guest_phone,
    r.check_in,
    r.check_out,
    r.status,
    r.payment_status,
    r.total_price,
    rm.name AS room_name
  INTO v_stay
  FROM public.room_reservations r
  JOIN public.rooms rm ON rm.id = r.room_id
  WHERE r.id = p_stay_id;

  IF v_stay.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation stay not found.');
  END IF;

  SELECT
    COALESCE(rs.service_charge_percent, 0),
    COALESCE(rs.tax_percent, 0),
    COALESCE(NULLIF(trim(rs.default_currency), ''), 'ETB')
  INTO v_service_pct, v_tax_pct, v_currency
  FROM public.resort_settings rs
  WHERE rs.id = true
  LIMIT 1;

  IF NOT FOUND THEN
    v_service_pct := 0;
    v_tax_pct := 0;
    v_currency := 'ETB';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_subtotal
  FROM public.charges
  WHERE stay_id = p_stay_id;

  v_service_charge := ROUND(v_subtotal * (v_service_pct / 100.0), 2);
  v_tax := ROUND((v_subtotal + v_service_charge) * (v_tax_pct / 100.0), 2);
  v_total := v_subtotal + v_service_charge + v_tax;

  v_prepaid_amount := CASE
    WHEN v_stay.payment_status = 'paid' THEN ROUND(COALESCE(v_stay.total_price, 0), 2)
    ELSE 0
  END;
  v_balance_due := GREATEST(0, v_total - v_prepaid_amount);

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'source_type', c.source_type,
      'source_id', c.source_id,
      'description', c.description,
      'quantity', c.quantity,
      'unit_price', c.unit_price,
      'amount', c.amount,
      'posted_at', c.posted_at
    ) ORDER BY c.posted_at ASC
  )
  INTO v_charges_json
  FROM public.charges c
  WHERE c.stay_id = p_stay_id;

  RETURN jsonb_build_object(
    'success', true,
    'stay', jsonb_build_object(
      'id', v_stay.id,
      'booking_number', v_stay.booking_number,
      'guest_name', v_stay.guest_name,
      'room_name', v_stay.room_name,
      'check_in', v_stay.check_in,
      'check_out', v_stay.check_out,
      'status', v_stay.status
    ),
    'charges', COALESCE(v_charges_json, '[]'::jsonb),
    'subtotal', v_subtotal,
    'service_charge_percent', v_service_pct,
    'service_charge', v_service_charge,
    'tax_percent', v_tax_pct,
    'tax', v_tax,
    'total', v_total,
    'prepaid_amount', v_prepaid_amount,
    'balance_due', v_balance_due,
    'reservation_payment_status', v_stay.payment_status,
    'currency', v_currency
  );
END;
$$;

-- Preserve 033 security hardening: restrict calculate_folio execution strictly to service_role
REVOKE ALL ON FUNCTION public.calculate_folio(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_folio(UUID) TO service_role;

DROP FUNCTION IF EXISTS public.checkout_and_generate_receipt(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.checkout_and_generate_receipt(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.checkout_and_generate_receipt(
  p_stay_id UUID,
  p_payment_method TEXT DEFAULT 'pay_at_resort',
  p_processed_by TEXT DEFAULT 'Front Desk Staff',
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay RECORD;
  v_staff_name TEXT;
  v_folio JSONB;
  v_receipt_id UUID;
  v_receipt_number TEXT;
  v_subtotal NUMERIC(12,2);
  v_service_pct NUMERIC(5,2);
  v_service_charge NUMERIC(12,2);
  v_tax_pct NUMERIC(5,2);
  v_tax NUMERIC(12,2);
  v_total NUMERIC(12,2);
  v_prepaid_amount NUMERIC(12,2);
  v_balance_due NUMERIC(12,2);
  v_currency TEXT;
  v_unsettled_orders INTEGER := 0;
  v_unsettled_requests INTEGER := 0;
  v_delivered_order RECORD;
  v_delivered_req RECORD;
  v_reg_res JSONB;
  v_clean_ref TEXT := NULLIF(UPPER(TRIM(p_payment_reference)), '');
  v_nights INTEGER;
  v_nightly_price NUMERIC(12,2);
  v_room_subtotal NUMERIC(12,2);
  c RECORD;
BEGIN
  -- 1. Staff Auth + RBAC Guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Staff authentication required to process guest checkout.';
  END IF;

  SELECT COALESCE(NULLIF(trim(u.full_name), ''), u.email)
  INTO v_staff_name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
    AND lower(r.name) IN ('admin', 'manager', 'staff')
  LIMIT 1;

  IF v_staff_name IS NULL AND NOT public.is_manager_or_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: User not authorized to perform checkout.';
  END IF;

  v_staff_name := COALESCE(v_staff_name, NULLIF(trim(p_processed_by), ''), 'Front Desk Staff');

  -- 2. Lock room_reservations row with FOR UPDATE
  SELECT
    r.id,
    r.booking_number,
    r.room_id,
    r.guest_name,
    r.status,
    r.check_in,
    r.check_out,
    r.subtotal,
    r.total_price,
    r.payment_status,
    rm.name AS room_name,
    COALESCE(rm.price_per_night, rm.base_price, 0) AS nightly_rate
  INTO v_stay
  FROM public.room_reservations r
  JOIN public.rooms rm ON rm.id = r.room_id
  WHERE r.id = p_stay_id
  FOR UPDATE;

  IF v_stay.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stay not found.');
  END IF;

  IF v_stay.status = 'checked_out' THEN
    SELECT rr.id, rr.receipt_number
    INTO v_receipt_id, v_receipt_number
    FROM public.resort_receipts rr
    WHERE rr.reservation_id = p_stay_id
    ORDER BY rr.created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'already_checked_out', true,
      'receipt_id', v_receipt_id,
      'receipt_number', v_receipt_number,
      'message', 'Stay is already checked out.'
    );
  END IF;

  IF v_stay.status IN ('cancelled', 'no_show', 'pending') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Stay cannot be checked out from status "' || v_stay.status || '". Guest must be checked in first.'
    );
  END IF;

  -- Prevent duplicate receipt even if a receipt row already exists
  SELECT rr.id, rr.receipt_number
  INTO v_receipt_id, v_receipt_number
  FROM public.resort_receipts rr
  WHERE rr.reservation_id = p_stay_id
  ORDER BY rr.created_at DESC
  LIMIT 1;

  IF v_receipt_id IS NOT NULL THEN
    UPDATE public.room_reservations
    SET status = 'checked_out',
        checked_out_at = COALESCE(checked_out_at, now()),
        payment_status = 'paid',
        updated_at = now()
    WHERE id = p_stay_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_checked_out', true,
      'receipt_id', v_receipt_id,
      'receipt_number', v_receipt_number,
      'message', 'Checkout receipt already exists for this stay.'
    );
  END IF;

  -- 3. In-Flight Orders & Priced Service Requests Guard
  SELECT COUNT(*)
  INTO v_unsettled_orders
  FROM public.orders
  WHERE guest_stay_id = p_stay_id
    AND status_id IN (1, 2, 3, 4, 7, 8);

  IF v_unsettled_orders > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNSETTLED_ORDERS: Guest still has ' || v_unsettled_orders || ' active order(s) in preparation or waiting for pickup. Please complete or cancel them before checkout.'
    );
  END IF;

  SELECT COUNT(*)
  INTO v_unsettled_requests
  FROM public.service_requests
  WHERE guest_stay_id = p_stay_id
    AND COALESCE(price, 0) > 0
    AND status_id IN (1, 2, 3, 4, 7, 8);

  IF v_unsettled_requests > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNSETTLED_SERVICES: Guest still has ' || v_unsettled_requests || ' active billable service request(s). Please complete or cancel them before checkout.'
    );
  END IF;

  -- 4. Guarantee room charge exists once (idempotent via unique source index)
  v_nights := GREATEST(1, (v_stay.check_out - v_stay.check_in));
  v_nightly_price := COALESCE(v_stay.nightly_rate, 0);
  v_room_subtotal := COALESCE(
    v_stay.subtotal,
    CASE
      WHEN v_nightly_price > 0 THEN ROUND(v_nightly_price * v_nights, 2)
      ELSE COALESCE(v_stay.total_price, 0)
    END
  );

  INSERT INTO public.charges (
    stay_id, source_type, source_id, description, quantity, unit_price, amount
  ) VALUES (
    p_stay_id,
    'room',
    p_stay_id,
    'Room Accommodation (' || v_nights || ' night' || CASE WHEN v_nights > 1 THEN 's' ELSE '' END || ') - ' || COALESCE(v_stay.room_name, 'Room'),
    v_nights,
    ROUND(v_room_subtotal / v_nights, 2),
    v_room_subtotal
  )
  ON CONFLICT (stay_id, source_type, source_id)
  WHERE source_id IS NOT NULL AND source_type IN ('room', 'order', 'service_request')
  DO NOTHING;

  -- 5. Auto-Complete Delivered (5) orders so delivered dining charges post to charges
  FOR v_delivered_order IN
    SELECT o.id, o.total
    FROM public.orders o
    WHERE o.guest_stay_id = p_stay_id
      AND o.status_id = 5
    FOR UPDATE
  LOOP
    UPDATE public.orders
    SET status_id = 6, updated_at = now()
    WHERE id = v_delivered_order.id;

    INSERT INTO public.charges (
      stay_id, source_type, source_id, description, quantity, unit_price, amount
    ) VALUES (
      p_stay_id,
      'order',
      v_delivered_order.id,
      'Restaurant Dining Order #' || substr(v_delivered_order.id::text, 1, 8),
      1,
      COALESCE(v_delivered_order.total, 0),
      COALESCE(v_delivered_order.total, 0)
    )
    ON CONFLICT (stay_id, source_type, source_id)
    WHERE source_id IS NOT NULL AND source_type IN ('room', 'order', 'service_request')
    DO NOTHING;

    INSERT INTO public.status_history (
      entity_type, entity_id, from_status_id, to_status_id, changed_by, notes
    ) VALUES (
      'order', v_delivered_order.id, 5, 6, auth.uid(), 'Auto-completed upon guest checkout folio settlement'
    );
  END LOOP;

  -- 5b. Auto-Complete Delivered (5) service requests so delivered service charges post to charges
  FOR v_delivered_req IN
    SELECT sr.id, sr.price, rs.name AS service_name
    FROM public.service_requests sr
    LEFT JOIN public.resort_services rs ON rs.id = sr.service_id
    WHERE sr.guest_stay_id = p_stay_id
      AND sr.status_id = 5
    FOR UPDATE
  LOOP
    UPDATE public.service_requests
    SET status_id = 6, updated_at = now()
    WHERE id = v_delivered_req.id;

    INSERT INTO public.charges (
      stay_id, source_type, source_id, description, quantity, unit_price, amount
    ) VALUES (
      p_stay_id,
      'service_request',
      v_delivered_req.id,
      'Resort Service: ' || COALESCE(NULLIF(trim(v_delivered_req.service_name), ''), 'Service #' || substr(v_delivered_req.id::text, 1, 8)),
      1,
      COALESCE(v_delivered_req.price, 0),
      COALESCE(v_delivered_req.price, 0)
    )
    ON CONFLICT (stay_id, source_type, source_id)
    WHERE source_id IS NOT NULL AND source_type IN ('room', 'order', 'service_request')
    DO NOTHING;

    INSERT INTO public.status_history (
      entity_type, entity_id, from_status_id, to_status_id, changed_by, notes
    ) VALUES (
      'service_request', v_delivered_req.id, 5, 6, auth.uid(), 'Auto-completed upon guest checkout folio settlement'
    );
  END LOOP;

  -- 6. Compute authoritative folio totals on the server
  v_folio := public.calculate_folio(p_stay_id);
  v_subtotal := (v_folio->>'subtotal')::NUMERIC;
  v_service_pct := (v_folio->>'service_charge_percent')::NUMERIC;
  v_service_charge := (v_folio->>'service_charge')::NUMERIC;
  v_tax_pct := (v_folio->>'tax_percent')::NUMERIC;
  v_tax := (v_folio->>'tax')::NUMERIC;
  v_total := (v_folio->>'total')::NUMERIC;
  v_prepaid_amount := COALESCE((v_folio->>'prepaid_amount')::NUMERIC, 0);
  v_balance_due := COALESCE((v_folio->>'balance_due')::NUMERIC, GREATEST(0, v_total - v_prepaid_amount));
  v_currency := COALESCE(v_folio->>'currency', 'ETB');

  -- 7. Register checkout payment reference against remaining balance due
  IF v_clean_ref IS NOT NULL THEN
    v_reg_res := public.register_payment_reference(v_clean_ref, 'receipt', p_stay_id, v_balance_due, v_currency);
    IF NOT (v_reg_res->>'success')::BOOLEAN THEN
      RETURN v_reg_res;
    END IF;
  END IF;

  -- 8. Generate resort_receipts record
  INSERT INTO public.resort_receipts (
    reservation_id,
    guest_name,
    room_number,
    subtotal,
    service_charge_percent,
    service_charge,
    tax_percent,
    tax,
    total,
    prepaid_amount,
    balance_due,
    currency,
    payment_method,
    payment_reference,
    processed_by
  ) VALUES (
    p_stay_id,
    v_stay.guest_name,
    v_stay.room_name,
    v_subtotal,
    v_service_pct,
    v_service_charge,
    v_tax_pct,
    v_tax,
    v_total,
    v_prepaid_amount,
    v_balance_due,
    v_currency,
    COALESCE(NULLIF(trim(p_payment_method), ''), 'pay_at_resort'),
    v_clean_ref,
    v_staff_name
  )
  RETURNING id, receipt_number INTO v_receipt_id, v_receipt_number;

  -- 9. Generate itemized receipt_items from folio charges
  FOR c IN SELECT * FROM public.charges WHERE stay_id = p_stay_id ORDER BY posted_at ASC LOOP
    INSERT INTO public.receipt_items (
      receipt_id,
      description,
      quantity,
      unit_price
    ) VALUES (
      v_receipt_id,
      c.description,
      c.quantity,
      c.unit_price
    );
  END LOOP;

  -- 10. Close reservation as checked_out and settled
  UPDATE public.room_reservations
  SET status = 'checked_out',
      checked_out_at = now(),
      payment_status = 'paid',
      payment_method = COALESCE(NULLIF(trim(p_payment_method), ''), payment_method),
      payment_reference = COALESCE(payment_reference, v_clean_ref),
      updated_at = now()
  WHERE id = p_stay_id;

  RETURN jsonb_build_object(
    'success', true,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number,
    'total', v_total,
    'prepaid_amount', v_prepaid_amount,
    'balance_due', v_balance_due,
    'currency', v_currency,
    'processed_by', v_staff_name,
    'message', 'Checkout completed and receipt generated from folio.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.checkout_and_generate_receipt(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_and_generate_receipt(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 4. Task 3 & 4: Fix Table Session Lookup, 6h TTL, UUID Casts & 'guest' changed_by
-- ============================================================================

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
  v_clean_token TEXT := NULLIF(trim(p_table_token), '');
  v_table RECORD;
  v_session RECORD;
  v_new_session_token TEXT;
  v_session_id UUID;
  SESSION_TTL_HOURS CONSTANT INTEGER := 6;
BEGIN
  IF v_clean_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Table token is required.');
  END IF;

  -- Safe UUID/qr_token resolution (never cast arbitrary strings as UUID)
  SELECT id, table_number, section, capacity, status, is_active
  INTO v_table
  FROM public.dining_tables
  WHERE (
      qr_token = v_clean_token
      OR (v_clean_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND id = v_clean_token::UUID)
    )
    AND is_active = true
  FOR UPDATE;

  IF v_table.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Table QR code is invalid or deactivated.');
  END IF;

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

  -- Close expired active sessions (>6 hours) and reset table availability if empty
  UPDATE public.table_sessions
  SET status = 'closed',
      closed_at = now()
  WHERE table_id = v_table.id
    AND status = 'active'
    AND opened_at < (now() - (SESSION_TTL_HOURS || ' hours')::INTERVAL);

  IF v_table.status = 'occupied' AND NOT EXISTS (
    SELECT 1
    FROM public.table_sessions ts
    WHERE ts.table_id = v_table.id
      AND ts.status = 'active'
      AND ts.opened_at >= (now() - (SESSION_TTL_HOURS || ' hours')::INTERVAL)
  ) THEN
    UPDATE public.dining_tables
    SET status = 'available', updated_at = now()
    WHERE id = v_table.id;
    v_table.status := 'available';
  END IF;

  IF v_table.status = 'occupied' THEN
    IF p_existing_session_token IS NOT NULL AND trim(p_existing_session_token) <> '' THEN
      SELECT id, session_token, status, guest_name, guest_stay_id, opened_at
      INTO v_session
      FROM public.table_sessions
      WHERE table_id = v_table.id
        AND session_token = trim(p_existing_session_token)
        AND status = 'active'
        AND opened_at >= (now() - (SESSION_TTL_HOURS || ' hours')::INTERVAL)
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

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Table ' || v_table.table_number || ' is currently occupied by another party. Please speak to staff to be seated or open a new session.',
      'table_status', 'occupied'
    );
  END IF;

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
  v_clean_room TEXT := NULLIF(trim(p_room_number), '');
  v_clean_table_token TEXT := NULLIF(trim(p_table_token), '');
  v_verified_stay_id UUID := p_guest_stay_id;
  v_stay_record RECORD;
  v_session_opened_at TIMESTAMPTZ;
  v_actor_id UUID;
  v_history_note TEXT;
  SESSION_TTL_HOURS CONSTANT INTEGER := 6;
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

  -- Resolve optional actor UUID safely (NULL for unauthenticated guests; never insert 'guest' text into UUID column)
  IF COALESCE(p_user_id, auth.uid()) IS NOT NULL THEN
    SELECT u.id INTO v_actor_id
    FROM public.users u
    WHERE u.id = COALESCE(p_user_id, auth.uid())
    LIMIT 1;
  END IF;

  -- 2. Room Delivery Verification
  IF v_clean_table_token IS NULL AND v_clean_room IS NOT NULL THEN
    IF v_verified_stay_id IS NULL AND p_user_id IS NULL THEN
      RAISE EXCEPTION 'A verified guest stay session is required to place room delivery orders.';
    END IF;

    IF v_verified_stay_id IS NOT NULL THEN
      SELECT r.id, r.guest_name, rm.name AS room_name
      INTO v_stay_record
      FROM public.room_reservations r
      JOIN public.rooms rm ON rm.id = r.room_id
      WHERE r.id = v_verified_stay_id
        AND r.status = 'checked_in'
        AND (
          lower(trim(rm.name)) = lower(v_clean_room)
          OR rm.name ILIKE '%' || v_clean_room || '%'
          OR (v_clean_room ~ '^[0-9]+$' AND rm.name ~ ('\m' || v_clean_room || '\M'))
        )
      LIMIT 1;

      IF v_stay_record.id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired room stay. Room number does not match your active checked-in stay.';
      END IF;
    END IF;
  END IF;

  -- 3. Validate dining table token & lock table row to prevent concurrent session split
  IF v_clean_table_token IS NOT NULL THEN
    SELECT dt.id, dt.status
    INTO v_table_id, v_table_status
    FROM public.dining_tables dt
    WHERE (
        dt.qr_token = v_clean_table_token
        OR (v_clean_table_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND dt.id = v_clean_table_token::UUID)
      )
      AND dt.is_active = true
    FOR UPDATE;

    IF v_table_id IS NULL THEN
      RAISE EXCEPTION 'Invalid or deactivated dining table QR code';
    END IF;

    IF v_table_status = 'out_of_service' THEN
      RAISE EXCEPTION 'Table is currently out of service';
    END IF;

    IF v_table_status = 'cleaning' THEN
      RAISE EXCEPTION 'Table is currently being sanitized. Please wait.';
    END IF;

    -- Close any stale active sessions older than 6 hours first
    UPDATE public.table_sessions
    SET status = 'closed',
        closed_at = now()
    WHERE table_id = v_table_id
      AND status = 'active'
      AND opened_at < (now() - (SESSION_TTL_HOURS || ' hours')::INTERVAL);

    IF v_table_status = 'occupied' AND NOT EXISTS (
      SELECT 1
      FROM public.table_sessions ts
      WHERE ts.table_id = v_table_id
        AND ts.status = 'active'
        AND ts.opened_at >= (now() - (SESSION_TTL_HOURS || ' hours')::INTERVAL)
    ) THEN
      UPDATE public.dining_tables
      SET status = 'available', updated_at = now()
      WHERE id = v_table_id;
      v_table_status := 'available';
    END IF;

    IF v_table_status = 'occupied' THEN
      IF p_session_token IS NOT NULL AND trim(p_session_token) <> '' THEN
        SELECT ts.id, ts.opened_at
        INTO v_table_session_id, v_session_opened_at
        FROM public.table_sessions ts
        WHERE ts.table_id = v_table_id
          AND ts.session_token = trim(p_session_token)
          AND ts.status = 'active'
        LIMIT 1;

        IF v_table_session_id IS NULL THEN
          RAISE EXCEPTION 'Table is currently occupied by another session';
        END IF;
      ELSE
        RAISE EXCEPTION 'Table is currently occupied. Please scan the QR code to open or resume your table session.';
      END IF;
    END IF;

    IF v_table_status = 'available' OR v_table_session_id IS NULL THEN
      INSERT INTO public.table_sessions (
        table_id,
        session_token,
        status,
        guest_name,
        guest_stay_id
      ) VALUES (
        v_table_id,
        encode(gen_random_bytes(16), 'hex'),
        'active',
        COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'),
        v_verified_stay_id
      )
      RETURNING id INTO v_table_session_id;

      UPDATE public.dining_tables
      SET status = 'occupied', updated_at = now()
      WHERE id = v_table_id;
    END IF;
  END IF;

  -- 4. Resolve default Pending status (id = 1)
  SELECT id
  INTO v_status_id
  FROM public.order_statuses
  WHERE lower(name) = 'pending'
  LIMIT 1;

  IF v_status_id IS NULL THEN
    v_status_id := 1;
  END IF;

  -- 5. Compute verified total strictly from menu_items
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

  -- 6. Atomic order insert with idempotency protection
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
      v_actor_id,
      v_department_id,
      v_status_id,
      v_total,
      NULLIF(trim(p_notes), ''),
      v_clean_room,
      COALESCE(NULLIF(trim(p_guest_name), ''), 'Guest'),
      v_table_id,
      v_table_session_id,
      v_verified_stay_id,
      v_clean_key
    )
    RETURNING id INTO v_order_id;
  EXCEPTION WHEN unique_violation THEN
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

  -- 7. Insert order items
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

  -- 8. Record initial Pending status in status_history (valid UUID or NULL)
  v_history_note := CASE
    WHEN v_table_id IS NOT NULL THEN 'Order placed by guest (Table QR)'
    ELSE 'Order placed by guest'
  END;

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
    v_actor_id,
    v_history_note
  );

  RETURN QUERY SELECT v_order_id, v_total, FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_guest_order(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT) TO authenticated, anon;

DROP FUNCTION IF EXISTS public.cancel_guest_item(TEXT, UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.cancel_guest_item(TEXT, UUID, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.cancel_guest_item(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_guest_stay_id UUID DEFAULT NULL,
  p_room_number TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'Cancelled by guest',
  p_session_token TEXT DEFAULT NULL
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
  v_session RECORD;
  v_actor_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT u.id INTO v_actor_id
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;
  END IF;

  SELECT id INTO v_cancelled_status_id
  FROM public.order_statuses
  WHERE lower(name) = 'cancelled'
  LIMIT 1;

  IF v_cancelled_status_id IS NULL THEN
    v_cancelled_status_id := 9;
  END IF;

  IF lower(trim(p_entity_type)) = 'order' THEN
    SELECT id, status_id, guest_stay_id, room_number, table_session_id
    INTO v_order
    FROM public.orders
    WHERE id = p_entity_id
    FOR UPDATE;

    IF v_order.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
    END IF;

    IF v_order.status_id <> 1 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'STATE_CONFLICT: Order has already started preparation and cannot be cancelled.'
      );
    END IF;

    IF v_order.table_session_id IS NOT NULL THEN
      IF p_session_token IS NOT NULL AND trim(p_session_token) <> '' THEN
        SELECT id INTO v_session
        FROM public.table_sessions
        WHERE id = v_order.table_session_id
          AND session_token = trim(p_session_token)
          AND status = 'active'
        LIMIT 1;

        IF v_session.id IS NULL THEN
          RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to cancel this table order.');
        END IF;
      ELSIF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Table session verification required to cancel order.');
      END IF;
    END IF;

    IF v_order.guest_stay_id IS NOT NULL THEN
      IF p_guest_stay_id IS NOT NULL AND v_order.guest_stay_id <> p_guest_stay_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to cancel this order.');
      ELSIF p_guest_stay_id IS NULL AND auth.uid() IS NULL AND v_order.table_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stay verification required to cancel this order.');
      END IF;
    END IF;

    UPDATE public.orders
    SET status_id = v_cancelled_status_id,
        updated_at = now()
    WHERE id = p_entity_id;

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
      v_actor_id,
      COALESCE(NULLIF(trim(p_reason), ''), 'Cancelled by guest')
    );

    RETURN jsonb_build_object('success', true, 'message', 'Order cancelled successfully.');

  ELSIF lower(trim(p_entity_type)) IN ('service_request', 'request') THEN
    SELECT id, status_id, guest_stay_id, room_number
    INTO v_request
    FROM public.service_requests
    WHERE id = p_entity_id
    FOR UPDATE;

    IF v_request.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Service request not found.');
    END IF;

    IF v_request.status_id <> 1 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'STATE_CONFLICT: Service request has already been accepted or started and cannot be cancelled.'
      );
    END IF;

    IF v_request.guest_stay_id IS NOT NULL THEN
      IF p_guest_stay_id IS NOT NULL AND v_request.guest_stay_id <> p_guest_stay_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to cancel this request.');
      ELSIF p_guest_stay_id IS NULL AND auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stay verification required to cancel this request.');
      END IF;
    END IF;

    UPDATE public.service_requests
    SET status_id = v_cancelled_status_id,
        updated_at = now()
    WHERE id = p_entity_id;

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
      v_actor_id,
      COALESCE(NULLIF(trim(p_reason), ''), 'Cancelled by guest')
    );

    RETURN jsonb_build_object('success', true, 'message', 'Service request cancelled successfully.');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid entity type.');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_guest_item(TEXT, UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, anon;

-- ============================================================================
-- 5. Task 5: Drop Old update_entity_status Overloads & Restore Auto Folio Posting
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_entity_status(TEXT, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.update_entity_status(TEXT, UUID, INTEGER, TEXT, TEXT);
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
  v_stay_id UUID;
  v_session_stay_id UUID;
  v_amount NUMERIC(12,2) := 0;
  v_room_number TEXT;
  v_service_name TEXT;
  v_valid_transition BOOLEAN := FALSE;
  v_changed_by UUID := auth.uid();
  v_charge_posted BOOLEAN := FALSE;
  v_stay_status TEXT;
BEGIN
  IF p_entity_type NOT IN ('order', 'service_request') THEN
    RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END IF;

  -- 1) Strict staff authentication
  IF v_changed_by IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Staff authentication required to update status.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.order_statuses WHERE id = p_to_status_id) THEN
    RAISE EXCEPTION 'Target status % does not exist', p_to_status_id;
  END IF;

  -- 2) Lock entity row with FOR UPDATE
  IF p_entity_type = 'order' THEN
    SELECT o.status_id, o.department_id, o.guest_stay_id, o.total, o.room_number, ts.guest_stay_id
    INTO v_from_status_id, v_department_id, v_stay_id, v_amount, v_room_number, v_session_stay_id
    FROM public.orders o
    LEFT JOIN public.table_sessions ts ON ts.id = o.table_session_id
    WHERE o.id = p_entity_id
    FOR UPDATE OF o;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order % not found', p_entity_id;
    END IF;

    v_stay_id := COALESCE(v_stay_id, v_session_stay_id);
  ELSIF p_entity_type = 'service_request' THEN
    SELECT sr.status_id, sr.department_id, sr.guest_stay_id, sr.price, sr.room_number, rs.name
    INTO v_from_status_id, v_department_id, v_stay_id, v_amount, v_room_number, v_service_name
    FROM public.service_requests sr
    LEFT JOIN public.resort_services rs ON rs.id = sr.service_id
    WHERE sr.id = p_entity_id
    FOR UPDATE OF sr;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service request % not found', p_entity_id;
    END IF;
  END IF;

  -- 3) Strict department / manager RBAC
  IF NOT (public.is_manager_or_admin() OR public.has_department_access(v_department_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN: User is not authorized for department %', v_department_id;
  END IF;

  -- 4) Optimistic concurrency check
  IF p_expected_status_id IS NOT NULL AND v_from_status_id <> p_expected_status_id THEN
    RAISE EXCEPTION 'STATE_CONFLICT: Expected status %, but current status is %', p_expected_status_id, v_from_status_id;
  END IF;

  -- 5) Validate transition graph
  -- 1: Pending, 2: Confirmed, 3: Preparing, 4: Ready, 5: Delivered, 6: Completed, 7: Accepted, 8: In Progress, 9: Cancelled
  IF v_from_status_id = p_to_status_id THEN
    v_valid_transition := TRUE;
  ELSIF v_from_status_id = 1 THEN
    v_valid_transition := p_to_status_id IN (7, 2, 8, 3, 9);
  ELSIF v_from_status_id IN (7, 2) THEN
    v_valid_transition := p_to_status_id IN (8, 3, 4, 9);
  ELSIF v_from_status_id IN (8, 3) THEN
    v_valid_transition := p_to_status_id IN (4, 6, 9);
  ELSIF v_from_status_id = 4 THEN
    v_valid_transition := p_to_status_id IN (5, 6, 9);
  ELSIF v_from_status_id = 5 THEN
    v_valid_transition := p_to_status_id IN (6);
  ELSIF v_from_status_id IN (6, 9) THEN
    v_valid_transition := FALSE;
  ELSE
    v_valid_transition := TRUE;
  END IF;

  IF NOT v_valid_transition AND public.is_manager_or_admin() THEN
    v_valid_transition := TRUE;
  END IF;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid status transition from % to % for %', v_from_status_id, p_to_status_id, p_entity_type;
  END IF;

  -- 6) Atomic status update
  IF p_entity_type = 'order' THEN
    UPDATE public.orders
    SET status_id = p_to_status_id, updated_at = now()
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'service_request' THEN
    UPDATE public.service_requests
    SET status_id = p_to_status_id, updated_at = now()
    WHERE id = p_entity_id;
  END IF;

  -- 7) Automatic folio posting ONLY when reaching Completed (6) and NOT coming from Cancelled (9)
  IF p_to_status_id = 6 AND v_from_status_id <> 9 THEN
    IF v_stay_id IS NULL AND NULLIF(trim(v_room_number), '') IS NOT NULL THEN
      SELECT r.id
      INTO v_stay_id
      FROM public.room_reservations r
      JOIN public.rooms rm ON rm.id = r.room_id
      WHERE r.status = 'checked_in'
        AND (
          lower(trim(rm.name)) = lower(trim(v_room_number))
          OR (trim(v_room_number) ~ '^[0-9]+$' AND rm.name ~ ('\m' || trim(v_room_number) || '\M'))
        )
      ORDER BY r.check_in DESC
      LIMIT 1;
    END IF;

    IF v_stay_id IS NOT NULL THEN
      SELECT status INTO v_stay_status
      FROM public.room_reservations
      WHERE id = v_stay_id;

      IF v_stay_status = 'checked_in' THEN
        INSERT INTO public.charges (
          stay_id,
          source_type,
          source_id,
          description,
          quantity,
          unit_price,
          amount
        ) VALUES (
          v_stay_id,
          p_entity_type,
          p_entity_id,
          CASE
            WHEN p_entity_type = 'order' THEN
              'Restaurant Dining Order #' || substr(p_entity_id::text, 1, 8)
            ELSE
              'Resort Service: ' || COALESCE(NULLIF(trim(v_service_name), ''), 'Service #' || substr(p_entity_id::text, 1, 8))
          END,
          1,
          COALESCE(v_amount, 0),
          COALESCE(v_amount, 0)
        )
        ON CONFLICT (stay_id, source_type, source_id)
        WHERE source_id IS NOT NULL AND source_type IN ('room', 'order', 'service_request')
        DO NOTHING;

        v_charge_posted := TRUE;
      END IF;
    END IF;
  END IF;

  -- 8) Status history log
  INSERT INTO public.status_history (
    entity_type,
    entity_id,
    from_status_id,
    to_status_id,
    changed_by,
    notes
  ) VALUES (
    p_entity_type,
    p_entity_id,
    v_from_status_id,
    p_to_status_id,
    v_changed_by,
    p_notes
  );

  -- 9) Department realtime notification
  INSERT INTO public.notifications (
    department_id,
    payload
  ) VALUES (
    v_department_id,
    jsonb_build_object(
      'event', 'status_changed',
      'entity_type', p_entity_type,
      'entity_id', p_entity_id,
      'from_status_id', v_from_status_id,
      'to_status_id', p_to_status_id,
      'notes', p_notes,
      'charge_posted', v_charge_posted,
      'changed_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'from_status_id', v_from_status_id,
    'to_status_id', p_to_status_id,
    'charge_posted', v_charge_posted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_entity_status(TEXT, UUID, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_entity_status(TEXT, UUID, INTEGER, TEXT, INTEGER) TO authenticated;

COMMIT;

