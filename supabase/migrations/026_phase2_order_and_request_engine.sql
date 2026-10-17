-- Migration 026: Phase 2 Unified Order and Request Engine
-- 1. Create service_requests table for guest wellness, spa, gym, and event bookings.
-- 2. Create status_history table to track every status transition.
-- 3. Create update_entity_status RPC with a defined transition graph.
-- 4. Fix notifications RLS so staff can read notifications assigned to their departments.
-- 5. Add orders, service_requests, and notifications to Supabase Realtime publication.

BEGIN;

-- 1. service_requests table
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_stay_id UUID NULL REFERENCES public.room_reservations(id) ON DELETE SET NULL,
  service_id UUID NULL REFERENCES public.resort_services(id) ON DELETE SET NULL,
  offering_id UUID NULL REFERENCES public.service_offerings(id) ON DELETE SET NULL,
  department_id INTEGER NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_time TEXT NULL,
  party_size INTEGER NOT NULL DEFAULT 1 CHECK (party_size > 0),
  guest_name TEXT NOT NULL,
  guest_phone TEXT NULL,
  room_number TEXT NULL,
  notes TEXT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  status_id INTEGER NOT NULL DEFAULT 1 REFERENCES public.order_statuses(id),
  assigned_to UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_dept_status ON public.service_requests(department_id, status_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON public.service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_guest_stay ON public.service_requests(guest_stay_id);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_requests_staff_select ON public.service_requests;
CREATE POLICY service_requests_staff_select ON public.service_requests
  FOR SELECT TO authenticated
  USING (
    is_manager_or_admin()
    OR has_department_access(department_id)
  );

DROP POLICY IF EXISTS service_requests_staff_update ON public.service_requests;
CREATE POLICY service_requests_staff_update ON public.service_requests
  FOR UPDATE TO authenticated
  USING (
    is_manager_or_admin()
    OR has_department_access(department_id)
  )
  WITH CHECK (
    is_manager_or_admin()
    OR has_department_access(department_id)
  );

DROP POLICY IF EXISTS service_requests_admin_manage ON public.service_requests;
CREATE POLICY service_requests_admin_manage ON public.service_requests
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- 2. status_history table
CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'service_request', 'reservation')),
  entity_id UUID NOT NULL,
  from_status_id INTEGER NULL REFERENCES public.order_statuses(id),
  to_status_id INTEGER NOT NULL REFERENCES public.order_statuses(id),
  changed_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_status_history_entity ON public.status_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON public.status_history(changed_at DESC);

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS status_history_staff_select ON public.status_history;
CREATE POLICY status_history_staff_select ON public.status_history
  FOR SELECT TO authenticated
  USING (
    is_manager_or_admin()
    OR is_staff_or_manager_or_admin()
  );

DROP POLICY IF EXISTS status_history_admin_manage ON public.status_history;
CREATE POLICY status_history_admin_manage ON public.status_history
  FOR ALL TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- 3. Shared transition engine RPC
CREATE OR REPLACE FUNCTION public.update_entity_status(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_to_status_id INTEGER,
  p_notes TEXT DEFAULT NULL
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

  -- 1) Fetch current status and department
  IF p_entity_type = 'order' THEN
    SELECT status_id, department_id
    INTO v_from_status_id, v_department_id
    FROM public.orders
    WHERE id = p_entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order % not found', p_entity_id;
    END IF;
  ELSIF p_entity_type = 'service_request' THEN
    SELECT status_id, department_id
    INTO v_from_status_id, v_department_id
    FROM public.service_requests
    WHERE id = p_entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service request % not found', p_entity_id;
    END IF;
  END IF;

  -- 2) Check permissions: user must have department access or be manager/admin
  IF v_changed_by IS NOT NULL THEN
    IF NOT (public.is_manager_or_admin() OR public.has_department_access(v_department_id)) THEN
      RAISE EXCEPTION 'User not authorized to update status for department %', v_department_id;
    END IF;
  END IF;

  -- 3) Validate transition graph
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

  -- 4) Apply update to entity
  IF p_entity_type = 'order' THEN
    UPDATE public.orders
    SET status_id = p_to_status_id, updated_at = now()
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'service_request' THEN
    UPDATE public.service_requests
    SET status_id = p_to_status_id, updated_at = now()
    WHERE id = p_entity_id;
  END IF;

  -- 5) Log to status_history
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

  -- 6) Send notification to department
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

REVOKE ALL ON FUNCTION public.update_entity_status(TEXT, UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_entity_status(TEXT, UUID, INTEGER, TEXT) TO authenticated;

-- 4. Fix notifications RLS so department staff can read department notifications
DROP POLICY IF EXISTS notifications_select_user ON public.notifications;
DROP POLICY IF EXISTS notifications_select_staff_or_dept ON public.notifications;

CREATE POLICY notifications_select_staff_or_dept ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_manager_or_admin()
    OR (department_id IS NOT NULL AND has_department_access(department_id))
  );

-- 5. Realtime publication registration
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

COMMIT;
