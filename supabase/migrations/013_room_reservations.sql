-- Room reservations for the guest booking flow.
-- Status lifecycle: pending -> confirmed -> checked_in -> checked_out,
-- with cancelled and no_show as terminal states.

CREATE TABLE IF NOT EXISTS public.room_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text NOT NULL UNIQUE DEFAULT ('TUL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  user_id uuid NULL,
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  guest_email text,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL DEFAULT 1 CHECK (guests > 0),
  total_price numeric(12,2),
  currency text NOT NULL DEFAULT 'ETB',
  payment_method text NOT NULL DEFAULT 'pay_at_resort' CHECK (payment_method IN ('pay_at_resort')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  special_requests text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in),
  CHECK (guest_email IS NULL OR position('@' in guest_email) > 1)
);

CREATE INDEX IF NOT EXISTS room_reservations_room_dates_idx
  ON public.room_reservations (room_id, check_in, check_out);

CREATE INDEX IF NOT EXISTS room_reservations_status_idx
  ON public.room_reservations (status);

CREATE INDEX IF NOT EXISTS room_reservations_user_idx
  ON public.room_reservations (user_id);

-- Prevent overlapping active reservations for the same room.
CREATE OR REPLACE FUNCTION public.prevent_room_double_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('pending', 'confirmed', 'checked_in') THEN
    IF EXISTS (
      SELECT 1
      FROM public.room_reservations r
      WHERE r.room_id = NEW.room_id
        AND r.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND r.status IN ('pending', 'confirmed', 'checked_in')
        AND daterange(r.check_in, r.check_out, '[)') && daterange(NEW.check_in, NEW.check_out, '[)')
    ) THEN
      RAISE EXCEPTION 'Room is not available for the selected dates';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_reservations_prevent_overlap ON public.room_reservations;
CREATE TRIGGER room_reservations_prevent_overlap
BEFORE INSERT OR UPDATE OF room_id, check_in, check_out, status
ON public.room_reservations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_room_double_booking();

CREATE OR REPLACE FUNCTION public.set_room_reservation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_reservations_updated_at ON public.room_reservations;
CREATE TRIGGER room_reservations_updated_at
BEFORE UPDATE ON public.room_reservations
FOR EACH ROW
EXECUTE FUNCTION public.set_room_reservation_updated_at();

ALTER TABLE public.room_reservations ENABLE ROW LEVEL SECURITY;

-- Guests can create reservations. Reads/management are intentionally left
-- to the authenticated manager/admin policies that will be added with the CMS.
DROP POLICY IF EXISTS room_reservations_guest_insert ON public.room_reservations;
CREATE POLICY room_reservations_guest_insert
ON public.room_reservations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
