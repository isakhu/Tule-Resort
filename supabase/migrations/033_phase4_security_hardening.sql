-- Migration: 033_phase4_security_hardening.sql
-- Description: Phase 4 Security Hardening (P1A)
--
-- 1. Lock down public.add_manual_charge:
--    - Require authenticated staff/manager/admin role via auth.uid().
--    - Revoke public/anon execution and validate positive quantity.
-- 2. Restrict public.calculate_folio execution to service_role (called exclusively
--    via authenticated/cookie-verified Next.js API route /api/folio/[stayId]).
-- 3. Remove unauthenticated public read policy (charges_public_read) on public.charges.
-- 4. Tighten housekeeping_tasks_staff and maintenance_requests_staff RLS policies
--    so only verified staff/manager/admin accounts (not arbitrary authenticated users)
--    can read or modify operational tasks.

BEGIN;

-- ============================================================================
-- 1. Harden public.add_manual_charge (Require Staff/Admin Auth)
-- ============================================================================

REVOKE ALL ON FUNCTION public.add_manual_charge(UUID, TEXT, NUMERIC, NUMERIC) FROM PUBLIC, anon;

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Staff authentication required to post folio charges.';
  END IF;

  IF NOT (
    public.is_manager_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND lower(r.name) IN ('admin', 'manager', 'staff')
    )
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: User is not authorized to post manual folio charges.';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Description is required.');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero.');
  END IF;

  IF v_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be greater than zero.');
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

REVOKE ALL ON FUNCTION public.add_manual_charge(UUID, TEXT, NUMERIC, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_manual_charge(UUID, TEXT, NUMERIC, NUMERIC) TO authenticated, service_role;

-- ============================================================================
-- 2. Restrict public.calculate_folio Direct RPC Access
-- ============================================================================

REVOKE ALL ON FUNCTION public.calculate_folio(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_folio(UUID) TO service_role;

-- ============================================================================
-- 3. Remove World-Readable Policy on public.charges
-- ============================================================================

DROP POLICY IF EXISTS charges_public_read ON public.charges;

DROP POLICY IF EXISTS charges_authenticated_owner_read ON public.charges;
CREATE POLICY charges_authenticated_owner_read ON public.charges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.room_reservations rr
      WHERE rr.id = charges.stay_id
        AND rr.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. Tighten Housekeeping & Maintenance RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS housekeeping_tasks_staff ON public.housekeeping_tasks;
CREATE POLICY housekeeping_tasks_staff ON public.housekeeping_tasks
  FOR ALL TO authenticated
  USING (
    public.is_manager_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND lower(r.name) IN ('admin', 'manager', 'staff')
    )
  )
  WITH CHECK (
    public.is_manager_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND lower(r.name) IN ('admin', 'manager', 'staff')
    )
  );

DROP POLICY IF EXISTS maintenance_requests_staff ON public.maintenance_requests;
CREATE POLICY maintenance_requests_staff ON public.maintenance_requests
  FOR ALL TO authenticated
  USING (
    public.is_manager_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND lower(r.name) IN ('admin', 'manager', 'staff')
    )
  )
  WITH CHECK (
    public.is_manager_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND lower(r.name) IN ('admin', 'manager', 'staff')
    )
  );

COMMIT;

