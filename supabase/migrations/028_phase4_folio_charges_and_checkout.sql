-- Phase 4: Folio, Charges, Server-side Tax & Service Charge, and Checkout Engine
BEGIN;

-- 1. Create charges table
CREATE TABLE IF NOT EXISTS public.charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id UUID NOT NULL REFERENCES public.room_reservations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('room', 'order', 'service_request', 'manual', 'other')),
  source_id UUID NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_charges_stay_id ON public.charges(stay_id);
CREATE INDEX IF NOT EXISTS idx_charges_source ON public.charges(source_type, source_id);

-- 2. Function to auto-post room charge upon check-in
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
  v_total_amount NUMERIC(12,2);
BEGIN
  IF NEW.status = 'checked_in' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'checked_in') THEN
    -- Prevent duplicate room charge
    IF NOT EXISTS (
      SELECT 1 FROM public.charges WHERE stay_id = NEW.id AND source_type = 'room'
    ) THEN
      v_nights := GREATEST(1, (NEW.check_out - NEW.check_in));

      SELECT name, price_per_night INTO v_room_name, v_nightly_price
      FROM public.rooms WHERE id = NEW.room_id;

      v_total_amount := COALESCE(NEW.total_price, v_nights * COALESCE(v_nightly_price, 0));

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
        ROUND(v_total_amount / v_nights, 2),
        v_total_amount,
        now()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_check_in_charge ON public.room_reservations;
CREATE TRIGGER trg_room_check_in_charge
AFTER INSERT OR UPDATE OF status ON public.room_reservations
FOR EACH ROW EXECUTE FUNCTION public.post_room_check_in_charge();

-- Backfill room charges for any existing checked_in reservations missing a room charge
DO $$
DECLARE
  r RECORD;
  v_nights INTEGER;
  v_room_name TEXT;
  v_total_amount NUMERIC(12,2);
BEGIN
  FOR r IN SELECT * FROM public.room_reservations WHERE status = 'checked_in' LOOP
    IF NOT EXISTS (SELECT 1 FROM public.charges WHERE stay_id = r.id AND source_type = 'room') THEN
      v_nights := GREATEST(1, (r.check_out - r.check_in));
      SELECT name INTO v_room_name FROM public.rooms WHERE id = r.room_id;
      v_total_amount := COALESCE(r.total_price, 0);

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
        r.id,
        'room',
        r.id,
        'Room Accommodation (' || v_nights || ' night' || CASE WHEN v_nights > 1 THEN 's' ELSE '' END || ') - ' || COALESCE(v_room_name, 'Room'),
        v_nights,
        ROUND(v_total_amount / v_nights, 2),
        v_total_amount,
        now()
      );
    END IF;
  END LOOP;
END $$;

-- 3. Upgrade update_entity_status to auto-post charges when reaching Completed (status_id = 6)
CREATE OR REPLACE FUNCTION public.update_entity_status(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_to_status_id INTEGER,
  p_changed_by TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status_id INTEGER;
  v_to_status_name TEXT;
  v_stay_id UUID;
  v_amount NUMERIC(12,2);
  v_desc TEXT;
  v_room_number TEXT;
  v_dept_id INTEGER;
BEGIN
  SELECT name INTO v_to_status_name FROM public.order_statuses WHERE id = p_to_status_id;
  IF v_to_status_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target status does not exist');
  END IF;

  IF lower(trim(p_entity_type)) = 'order' THEN
    SELECT status_id, guest_stay_id, total, room_number, department_id
    INTO v_current_status_id, v_stay_id, v_amount, v_room_number, v_dept_id
    FROM public.orders WHERE id = p_entity_id;

    IF v_current_status_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    UPDATE public.orders
    SET status_id = p_to_status_id, updated_at = now()
    WHERE id = p_entity_id;

    -- If transitioning to Completed (6), auto-post charge to guest stay folio
    IF p_to_status_id = 6 THEN
      IF v_stay_id IS NULL AND v_room_number IS NOT NULL THEN
        SELECT r.id INTO v_stay_id
        FROM public.room_reservations r
        JOIN public.rooms rm ON rm.id = r.room_id
        WHERE r.status = 'checked_in' AND rm.name ILIKE '%' || trim(v_room_number) || '%'
        ORDER BY r.check_in DESC LIMIT 1;
      END IF;

      IF v_stay_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.charges WHERE stay_id = v_stay_id AND source_type = 'order' AND source_id = p_entity_id) THEN
          INSERT INTO public.charges (
            stay_id, source_type, source_id, description, quantity, unit_price, amount
          ) VALUES (
            v_stay_id, 'order', p_entity_id,
            'Restaurant Dining Order #' || substr(p_entity_id::text, 1, 8),
            1, COALESCE(v_amount, 0), COALESCE(v_amount, 0)
          );
        END IF;
      END IF;
    END IF;

  ELSIF lower(trim(p_entity_type)) IN ('service_request', 'request') THEN
    SELECT status_id, guest_stay_id, price, service_id, room_number, department_id
    INTO v_current_status_id, v_stay_id, v_amount, v_desc, v_room_number, v_dept_id
    FROM public.service_requests WHERE id = p_entity_id;

    IF v_current_status_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Service request not found');
    END IF;

    UPDATE public.service_requests
    SET status_id = p_to_status_id, updated_at = now()
    WHERE id = p_entity_id;

    -- If transitioning to Completed (6), auto-post charge to guest stay folio
    IF p_to_status_id = 6 THEN
      IF v_stay_id IS NULL AND v_room_number IS NOT NULL THEN
        SELECT r.id INTO v_stay_id
        FROM public.room_reservations r
        JOIN public.rooms rm ON rm.id = r.room_id
        WHERE r.status = 'checked_in' AND rm.name ILIKE '%' || trim(v_room_number) || '%'
        ORDER BY r.check_in DESC LIMIT 1;
      END IF;

      IF v_stay_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.charges WHERE stay_id = v_stay_id AND source_type = 'service_request' AND source_id = p_entity_id) THEN
          INSERT INTO public.charges (
            stay_id, source_type, source_id, description, quantity, unit_price, amount
          ) VALUES (
            v_stay_id, 'service_request', p_entity_id,
            'Resort Service: ' || initcap(replace(COALESCE(v_desc, 'Service'), '-', ' ')),
            1, COALESCE(v_amount, 0), COALESCE(v_amount, 0)
          );
        END IF;
      END IF;
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported entity type');
  END IF;

  -- Record transition in status_history
  INSERT INTO public.status_history (
    entity_type, entity_id, from_status_id, to_status_id, changed_by, notes
  ) VALUES (
    p_entity_type, p_entity_id, v_current_status_id, p_to_status_id, p_changed_by, p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'from_status_id', v_current_status_id,
    'to_status_id', p_to_status_id,
    'status_name', v_to_status_name
  );
END;
$$;

-- 4. Calculate Folio Totals RPC (Server-side Tax & Service Charge)
CREATE OR REPLACE FUNCTION public.calculate_folio(p_stay_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay RECORD;
  v_subtotal NUMERIC(12,2) := 0;
  v_service_pct NUMERIC(5,2) := 10.00;
  v_tax_pct NUMERIC(5,2) := 15.00;
  v_service_charge NUMERIC(12,2) := 0;
  v_tax NUMERIC(12,2) := 0;
  v_total NUMERIC(12,2) := 0;
  v_currency TEXT := 'ETB';
  v_charges_json JSONB;
BEGIN
  SELECT r.id, r.booking_number, r.guest_name, r.guest_phone, r.check_in, r.check_out, r.status, rm.name as room_name
  INTO v_stay
  FROM public.room_reservations r
  JOIN public.rooms rm ON rm.id = r.room_id
  WHERE r.id = p_stay_id;

  IF v_stay.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation stay not found.');
  END IF;

  -- Read rates from resort_settings
  SELECT
    COALESCE(service_charge_percent, 10.00),
    COALESCE(tax_percent, 15.00),
    COALESCE(default_currency, 'ETB')
  INTO v_service_pct, v_tax_pct, v_currency
  FROM public.resort_settings
  WHERE id = true
  LIMIT 1;

  -- Sum charges
  SELECT COALESCE(SUM(amount), 0) INTO v_subtotal
  FROM public.charges WHERE stay_id = p_stay_id;

  v_service_charge := ROUND(v_subtotal * (v_service_pct / 100.0), 2);
  v_tax := ROUND((v_subtotal + v_service_charge) * (v_tax_pct / 100.0), 2);
  v_total := v_subtotal + v_service_charge + v_tax;

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
  ) INTO v_charges_json
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
    'currency', v_currency
  );
END;
$$;

-- 5. Checkout & Receipt Generation RPC
CREATE OR REPLACE FUNCTION public.checkout_and_generate_receipt(
  p_stay_id UUID,
  p_payment_method TEXT DEFAULT 'pay_at_resort',
  p_processed_by TEXT DEFAULT 'Front Desk Staff'
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
  c RECORD;
BEGIN
  SELECT r.id, r.booking_number, r.guest_name, r.status, rm.name as room_name
  INTO v_stay
  FROM public.room_reservations r
  JOIN public.rooms rm ON rm.id = r.room_id
  WHERE r.id = p_stay_id;

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

  -- Compute folio totals on the server
  v_folio := public.calculate_folio(p_stay_id);
  v_subtotal := (v_folio->>'subtotal')::NUMERIC;
  v_service_pct := (v_folio->>'service_charge_percent')::NUMERIC;
  v_service_charge := (v_folio->>'service_charge')::NUMERIC;
  v_tax_pct := (v_folio->>'tax_percent')::NUMERIC;
  v_tax := (v_folio->>'tax')::NUMERIC;
  v_total := (v_folio->>'total')::NUMERIC;
  v_currency := COALESCE(v_folio->>'currency', 'ETB');

  -- Generate resort_receipts record
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
    COALESCE(p_processed_by, 'Front Desk Staff')
  )
  RETURNING id, receipt_number INTO v_receipt_id, v_receipt_number;

  -- Generate itemized receipt_items from charges
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

  -- Mark reservation as checked_out and paid
  UPDATE public.room_reservations
  SET status = 'checked_out',
      checked_out_at = now(),
      payment_status = 'paid',
      payment_method = COALESCE(p_payment_method, payment_method),
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

-- 6. Add manual charge RPC
CREATE OR REPLACE FUNCTION public.add_manual_charge(
  p_stay_id UUID,
  p_description TEXT,
  p_amount NUMERIC(12,2),
  p_quantity NUMERIC(10,2) DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_charge_id UUID;
  v_qty NUMERIC(10,2) := COALESCE(p_quantity, 1);
  v_total NUMERIC(12,2);
BEGIN
  IF p_description IS NULL OR trim(p_description) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Description is required.');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.room_reservations WHERE id = p_stay_id AND status = 'checked_in') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stay must be currently checked in.');
  END IF;

  v_total := ROUND(p_amount * v_qty, 2);

  INSERT INTO public.charges (
    stay_id,
    source_type,
    description,
    quantity,
    unit_price,
    amount
  ) VALUES (
    p_stay_id,
    'manual',
    trim(p_description),
    v_qty,
    p_amount,
    v_total
  )
  RETURNING id INTO v_charge_id;

  RETURN jsonb_build_object('success', true, 'charge_id', v_charge_id, 'amount', v_total);
END;
$$;

-- 7. RLS on charges
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS charges_public_read ON public.charges;
CREATE POLICY charges_public_read ON public.charges
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS charges_staff_all ON public.charges;
CREATE POLICY charges_staff_all ON public.charges
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

-- 8. Add charges to Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'charges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.charges;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

COMMIT;
