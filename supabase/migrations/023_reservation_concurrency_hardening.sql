-- Migration 023: make room availability check and reservation insert atomic
-- at the database level. The room row lock serializes competing bookings for
-- the same room while the overlap check and insert run in one transaction.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_room_reservation_with_payment(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_guests INTEGER,
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_guest_email TEXT DEFAULT NULL,
  p_special_requests TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'pay_at_resort',
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  booking_number TEXT,
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
  v_total NUMERIC(12,2);
  v_nightly_rate NUMERIC(12,2);
  v_conflict BOOLEAN;
BEGIN
  IF p_room_id IS NULL THEN
    RAISE EXCEPTION 'Room is required.';
  END IF;

  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
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

  IF p_payment_method IS NULL OR p_payment_method NOT IN (
    'pay_at_resort', 'telebirr', 'cbe_birr', 'bank_transfer'
  ) THEN
    RAISE EXCEPTION 'Unsupported payment method.';
  END IF;

  -- Lock the room before checking conflicts. Concurrent requests for this room
  -- wait here; after acquiring the lock they see any committed reservation.
  SELECT r.id, r.price_per_night, r.base_price, r.capacity, r.max_occupancy,
         r.is_active, r.is_available
    INTO v_room
  FROM public.rooms AS r
  WHERE r.id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.';
  END IF;

  IF v_room.is_active IS DISTINCT FROM true OR v_room.is_available IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This room is currently unavailable for booking.';
  END IF;

  IF p_guests > COALESCE(v_room.max_occupancy, v_room.capacity, 0) THEN
    RAISE EXCEPTION 'This room allows up to % guests.', COALESCE(v_room.max_occupancy, v_room.capacity, 0);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.room_reservations AS rr
    WHERE rr.room_id = p_room_id
      AND rr.status IN ('pending', 'confirmed', 'checked_in')
      AND rr.check_in < p_check_out
      AND rr.check_out > p_check_in
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'This room is already booked for those dates.';
  END IF;

  v_nights := p_check_out - p_check_in;
  v_nightly_rate := COALESCE(NULLIF(v_room.price_per_night, 0), v_room.base_price, 0);
  IF v_nightly_rate < 0 THEN
    RAISE EXCEPTION 'This room has an invalid nightly rate.';
  END IF;
  v_total := v_nightly_rate * v_nights;

  INSERT INTO public.room_reservations (
    room_id, user_id, guest_name, guest_phone, guest_email,
    check_in, check_out, guests, total_price, currency, status,
    payment_method, payment_status, special_requests
  )
  VALUES (
    v_room.id, p_user_id, trim(p_guest_name), trim(p_guest_phone),
    NULLIF(trim(p_guest_email), ''), p_check_in, p_check_out, p_guests,
    v_total, 'ETB', 'pending', p_payment_method, 'pending',
    NULLIF(trim(p_special_requests), '')
  )
  RETURNING room_reservations.id,
            room_reservations.booking_number,
            room_reservations.total_price,
            room_reservations.currency,
            room_reservations.status
  INTO id, booking_number, total_price, currency, status;

  RETURN NEXT;
END;
$$;

-- Keep the original function signature for any older server callers, but route
-- it through the same conflict-safe operation with the default pay-at-resort
-- method. Both functions are server-only to avoid caller-supplied user IDs.
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
  total_price NUMERIC,
  currency TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.create_room_reservation_with_payment(
    p_room_id, p_check_in, p_check_out, p_guests,
    p_guest_name, p_guest_phone, p_guest_email, p_special_requests,
    'pay_at_resort', p_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_room_reservation_with_payment(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_reservation_with_payment(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.create_room_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;

COMMIT;
