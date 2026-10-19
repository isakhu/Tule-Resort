-- Migration: 032_phase3_payment_and_checkout_guards.sql
-- Description: Phase 3 Payment Reference Deduplication, Checkout Guards & Folio Settlement Integrity
--
-- 1. Add payment_reference column and deduplication constraints across reservations, orders, and receipts.
-- 2. Create central used_payment_references table to prevent cross-replay of CBE/Telebirr payment receipts.
-- 3. Harden checkout_and_generate_receipt:
--    - Enforce staff authentication & RBAC.
--    - Lock room_reservations row with FOR UPDATE.
--    - Enforce In-Flight Orders Guard: Block checkout if any orders are in progress (Pending, Accepted, Preparing, Ready).
--    - Auto-transition Delivered (5) orders to Completed (6) to guarantee delivered charges post to the final folio receipt.

BEGIN;

-- ============================================================================
-- 1. Payment Reference Deduplication Across All Financial Entities
-- ============================================================================

-- Add payment_reference column where missing
ALTER TABLE public.room_reservations ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.resort_receipts ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Normalize and create unique partial indexes on individual tables
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_reservations_payment_ref 
  ON public.room_reservations (UPPER(TRIM(payment_reference))) 
  WHERE payment_reference IS NOT NULL AND TRIM(payment_reference) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_ref 
  ON public.orders (UPPER(TRIM(payment_reference))) 
  WHERE payment_reference IS NOT NULL AND TRIM(payment_reference) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_resort_receipts_payment_ref 
  ON public.resort_receipts (UPPER(TRIM(payment_reference))) 
  WHERE payment_reference IS NOT NULL AND TRIM(payment_reference) <> '';

-- Central registry table for global replay protection
CREATE TABLE IF NOT EXISTS public.used_payment_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  normalized_reference TEXT GENERATED ALWAYS AS (UPPER(TRIM(reference))) STORED UNIQUE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('reservation', 'order', 'receipt', 'charge')),
  entity_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ETB',
  recorded_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_used_payment_ref_normalized ON public.used_payment_references(normalized_reference);

ALTER TABLE public.used_payment_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS used_payment_ref_staff ON public.used_payment_references;
CREATE POLICY used_payment_ref_staff ON public.used_payment_references
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

-- Helper RPC to register and verify unique payment reference
CREATE OR REPLACE FUNCTION public.register_payment_reference(
  p_reference TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_amount NUMERIC(12,2),
  p_currency TEXT DEFAULT 'ETB'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT := UPPER(TRIM(p_reference));
BEGIN
  IF v_norm IS NULL OR v_norm = '' THEN
    RETURN jsonb_build_object('success', true, 'message', 'No reference provided.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.used_payment_references WHERE normalized_reference = v_norm
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DUPLICATE_PAYMENT_REFERENCE: This transaction reference (' || p_reference || ') has already been recorded and cannot be reused.'
    );
  END IF;

  INSERT INTO public.used_payment_references (
    reference, entity_type, entity_id, amount, currency, recorded_by
  ) VALUES (
    p_reference, p_entity_type, p_entity_id, p_amount, COALESCE(p_currency, 'ETB'), auth.uid()
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'DUPLICATE_PAYMENT_REFERENCE: This transaction reference (' || p_reference || ') has already been recorded.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_payment_reference(TEXT, TEXT, UUID, NUMERIC, TEXT) TO authenticated, anon;


-- ============================================================================
-- 2. Hardened checkout_and_generate_receipt RPC
-- ============================================================================

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
  v_folio JSONB;
  v_receipt_id UUID;
  v_receipt_number TEXT;
  v_subtotal NUMERIC(12,2);
  v_service_pct NUMERIC(5,2);
  v_service_charge NUMERIC(12,2);
  v_tax_pct NUMERIC(5,2);
  v_tax NUMERIC(12,2);
  v_total NUMERIC(12,2);
  v_currency TEXT;
  v_unsettled_count INTEGER;
  v_delivered_order RECORD;
  v_reg_res JSONB;
  v_clean_ref TEXT := NULLIF(UPPER(TRIM(p_payment_reference)), '');
  c RECORD;
BEGIN
  -- 1. Staff RBAC Guard: Checkout must be initiated by authorized staff or manager
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Staff authentication required to process guest checkout.';
  END IF;

  IF NOT (
    public.is_manager_or_admin() 
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND lower(r.name) IN ('admin', 'manager', 'staff')
    )
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: User not authorized to perform checkout.';
  END IF;

  -- 2. Lock room_reservations row with FOR UPDATE
  SELECT r.id, r.booking_number, r.guest_name, r.status, rm.name as room_name
  INTO v_stay
  FROM public.room_reservations r
  JOIN public.rooms rm ON rm.id = r.room_id
  WHERE r.id = p_stay_id
  FOR UPDATE;

  IF v_stay.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stay not found.');
  END IF;

  IF v_stay.status = 'checked_out' THEN
    SELECT id, receipt_number INTO v_receipt_id, v_receipt_number
    FROM public.resort_receipts WHERE reservation_id = p_stay_id
    ORDER BY created_at DESC LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'already_checked_out', true,
      'receipt_id', v_receipt_id,
      'receipt_number', v_receipt_number,
      'message', 'Stay is already checked out.'
    );
  END IF;

  -- 3. In-Flight Orders Guard:
  -- Block checkout if any order is still in preparation or pending delivery (1, 2, 3, 4, 7, 8)
  SELECT COUNT(*)
  INTO v_unsettled_count
  FROM public.orders
  WHERE guest_stay_id = p_stay_id
    AND status_id IN (1, 2, 3, 4, 7, 8);

  IF v_unsettled_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNSETTLED_ORDERS: Guest still has ' || v_unsettled_count || ' active order(s) in preparation or waiting for pickup. Please complete or cancel them before checkout.'
    );
  END IF;

  -- 4. Auto-Complete Delivered (5) orders so all delivered dining charges post to charges
  FOR v_delivered_order IN 
    SELECT o.id, o.total, o.department_id
    FROM public.orders o
    WHERE o.guest_stay_id = p_stay_id
      AND o.status_id = 5
    FOR UPDATE
  LOOP
    -- Update order to Completed (6)
    UPDATE public.orders
    SET status_id = 6, updated_at = now()
    WHERE id = v_delivered_order.id;

    -- Ensure posted to charges
    IF NOT EXISTS (
      SELECT 1 FROM public.charges WHERE stay_id = p_stay_id AND source_type = 'order' AND source_id = v_delivered_order.id
    ) THEN
      INSERT INTO public.charges (
        stay_id, source_type, source_id, description, quantity, unit_price, amount
      ) VALUES (
        p_stay_id, 'order', v_delivered_order.id,
        'Restaurant Dining Order #' || substr(v_delivered_order.id::text, 1, 8),
        1, COALESCE(v_delivered_order.total, 0), COALESCE(v_delivered_order.total, 0)
      );
    END IF;

    -- Log transition
    INSERT INTO public.status_history (
      entity_type, entity_id, from_status_id, to_status_id, changed_by, notes
    ) VALUES (
      'order', v_delivered_order.id, 5, 6, auth.uid(), 'Auto-completed upon guest checkout folio settlement'
    );
  END LOOP;

  -- 5. Compute folio totals on the server
  v_folio := public.calculate_folio(p_stay_id);
  v_subtotal := (v_folio->>'subtotal')::NUMERIC;
  v_service_pct := (v_folio->>'service_charge_percent')::NUMERIC;
  v_service_charge := (v_folio->>'service_charge')::NUMERIC;
  v_tax_pct := (v_folio->>'tax_percent')::NUMERIC;
  v_tax := (v_folio->>'tax')::NUMERIC;
  v_total := (v_folio->>'total')::NUMERIC;
  v_currency := COALESCE(v_folio->>'currency', 'ETB');

  -- 6. Verify and register payment reference if provided
  IF v_clean_ref IS NOT NULL THEN
    v_reg_res := public.register_payment_reference(v_clean_ref, 'receipt', p_stay_id, v_total, v_currency);
    IF NOT (v_reg_res->>'success')::BOOLEAN THEN
      RETURN v_reg_res;
    END IF;
  END IF;

  -- 7. Generate resort_receipts record
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
    v_currency,
    COALESCE(p_payment_method, 'pay_at_resort'),
    v_clean_ref,
    COALESCE(p_processed_by, 'Front Desk Staff')
  )
  RETURNING id, receipt_number INTO v_receipt_id, v_receipt_number;

  -- 8. Generate itemized receipt_items from charges
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

  -- 9. Mark reservation as checked_out and paid
  UPDATE public.room_reservations
  SET status = 'checked_out',
      checked_out_at = now(),
      payment_status = 'paid',
      payment_method = COALESCE(p_payment_method, payment_method),
      payment_reference = COALESCE(v_clean_ref, payment_reference),
      updated_at = now()
  WHERE id = p_stay_id;

  RETURN jsonb_build_object(
    'success', true,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number,
    'total', v_total,
    'currency', v_currency,
    'message', 'Checkout completed and receipt generated from folio.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.checkout_and_generate_receipt(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_and_generate_receipt(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
