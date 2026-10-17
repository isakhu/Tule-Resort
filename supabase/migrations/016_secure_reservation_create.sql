-- Secure guest reservation creation.
-- Uses SECURITY DEFINER so the public booking API can create reservations
-- without restoring a broad anon INSERT policy on room_reservations.

BEGIN;

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
DECLARE
  v_room RECORD;
  v_nights INTEGER;
  v_total NUMERIC(12,2);
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

  SELECT id, name, price, currency, capacity, is_active, is_available
    INTO v_room
  FROM public.rooms
  WHERE id = p_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.';
  END IF;

  IF NOT v_room.is_active OR NOT v_room.is_available THEN
    RAISE EXCEPTION 'This room is currently unavailable for booking.';
  END IF;

  IF p_guests > COALESCE(v_room.capacity, 0) THEN
    RAISE EXCEPTION 'This room allows up to % guests.', v_room.capacity;
  END IF;

  v_nights := p_check_out - p_check_in;
  v_total := COALESCE(v_room.price, 0) * v_nights;

  INSERT INTO public.room_reservations (
    room_id,
    user_id,
    guest_name,
    guest_phone,
    guest_email,
    check_in,
    check_out,
    guests,
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
    v_total,
    COALESCE(v_room.currency, 'ETB'),
    'pending',
    'pay_at_resort',
    'pending',
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

REVOKE ALL ON FUNCTION public.create_room_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_room_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.create_room_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

COMMIT;
