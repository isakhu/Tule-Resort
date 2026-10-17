-- Migration: 029_phase5_cleanup.sql
-- Description: Phase 5 Final Polish & System Integrity:
--   1. Fix public.create_room_reservation to use price_per_night and default currency 'ETB'.
--   2. Add backwards-compatible price & currency columns on public.rooms.
--   3. Ensure housekeeping_tasks and maintenance_requests tables exist with RLS policies.
--   4. Enforce relational integrity for housekeeping and maintenance to public.users.
--   5. Extend notifications update policy so staff with department access can mark notifications read.
--   6. Add real-time notification trigger for new guest service requests.
--   7. Publish housekeeping_tasks and maintenance_requests to supabase_realtime.

BEGIN;

-- 1. Ensure rooms has currency and price alias column
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ETB';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'price'
  ) THEN
    BEGIN
      ALTER TABLE public.rooms ADD COLUMN price NUMERIC(12,2) GENERATED ALWAYS AS (price_per_night) STORED;
    EXCEPTION WHEN OTHERS THEN
      ALTER TABLE public.rooms ADD COLUMN price NUMERIC(12,2) DEFAULT 0;
      UPDATE public.rooms SET price = COALESCE(price_per_night, base_price, 0);
    END;
  END IF;
END $$;

-- 2. Robust create_room_reservation RPC
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
  v_rate NUMERIC(12,2);
  v_total NUMERIC(12,2);
  v_currency TEXT;
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

  SELECT r.id, r.name, COALESCE(r.price_per_night, r.base_price, 0) AS nightly_rate, r.capacity, r.is_active, r.is_available
    INTO v_room
  FROM public.rooms r
  WHERE r.id = p_room_id;

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
  v_rate := v_room.nightly_rate;
  v_total := v_rate * v_nights;
  v_currency := 'ETB';

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
    v_currency,
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

-- 3. Ensure Housekeeping & Maintenance tables exist
CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  assigned_to uuid NULL,
  task_type text NOT NULL DEFAULT 'cleaning',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NULL REFERENCES public.rooms(id) ON DELETE SET NULL,
  reported_by uuid NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','resolved','closed')),
  assigned_to uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS housekeeping_tasks_staff ON public.housekeeping_tasks;
CREATE POLICY housekeeping_tasks_staff ON public.housekeeping_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS maintenance_requests_staff ON public.maintenance_requests;
CREATE POLICY maintenance_requests_staff ON public.maintenance_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Cleanup and enforce relational integrity for Housekeeping & Maintenance
UPDATE public.housekeeping_tasks
  SET assigned_to = NULL
  WHERE assigned_to IS NOT NULL AND assigned_to NOT IN (SELECT id FROM public.users);

UPDATE public.maintenance_requests
  SET assigned_to = NULL
  WHERE assigned_to IS NOT NULL AND assigned_to NOT IN (SELECT id FROM public.users);

UPDATE public.maintenance_requests
  SET reported_by = NULL
  WHERE reported_by IS NOT NULL AND reported_by NOT IN (SELECT id FROM public.users);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_housekeeping_assigned_to'
  ) THEN
    ALTER TABLE public.housekeeping_tasks
      ADD CONSTRAINT fk_housekeeping_assigned_to
      FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_maintenance_assigned_to'
  ) THEN
    ALTER TABLE public.maintenance_requests
      ADD CONSTRAINT fk_maintenance_assigned_to
      FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_maintenance_reported_by'
  ) THEN
    ALTER TABLE public.maintenance_requests
      ADD CONSTRAINT fk_maintenance_reported_by
      FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Extend notifications update policy for staff
DROP POLICY IF EXISTS notifications_update_user ON public.notifications;
DROP POLICY IF EXISTS notifications_update_staff_or_dept ON public.notifications;

CREATE POLICY notifications_update_staff_or_dept ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR is_manager_or_admin()
    OR (department_id IS NOT NULL AND has_department_access(department_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_manager_or_admin()
    OR (department_id IS NOT NULL AND has_department_access(department_id))
  );

-- 6. Trigger for new service request notifications
CREATE OR REPLACE FUNCTION public.notify_on_service_request_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.notifications (
    department_id,
    payload
  )
  VALUES (
    NEW.department_id,
    jsonb_build_object(
      'event', 'new_service_request',
      'request_id', NEW.id,
      'title', NEW.title,
      'room_number', NEW.room_number,
      'priority', NEW.priority,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_service_request_insert ON public.service_requests;
CREATE TRIGGER trg_notify_on_service_request_insert
  AFTER INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_service_request_insert();

-- 7. Add housekeeping & maintenance to Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.housekeeping_tasks;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

COMMIT;
