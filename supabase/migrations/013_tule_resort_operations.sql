-- Tule Resort operations: configurable charges, payments, receipts, housekeeping and maintenance.

CREATE TABLE IF NOT EXISTS public.resort_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  service_charge_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (service_charge_percent >= 0 AND service_charge_percent <= 100),
  tax_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (tax_percent >= 0 AND tax_percent <= 100),
  default_currency text NOT NULL DEFAULT 'ETB',
  cancellation_deadline_hours integer NOT NULL DEFAULT 24 CHECK (cancellation_deadline_hours >= 0),
  auto_no_show_enabled boolean NOT NULL DEFAULT false,
  auto_no_show_hours integer NOT NULL DEFAULT 4 CHECK (auto_no_show_hours >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.resort_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.room_reservations
  DROP CONSTRAINT IF EXISTS room_reservations_payment_method_check;
ALTER TABLE public.room_reservations
  ADD CONSTRAINT room_reservations_payment_method_check
  CHECK (payment_method IN ('pay_at_resort','telebirr','cbe_birr','bank_transfer'));

ALTER TABLE public.room_reservations
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','partial','refunded','failed'));
ALTER TABLE public.room_reservations
  ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.room_reservations
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
ALTER TABLE public.room_reservations
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz;
ALTER TABLE public.room_reservations
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE TABLE IF NOT EXISTS public.resort_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE DEFAULT ('TR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  reservation_id uuid NULL REFERENCES public.room_reservations(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  room_number text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  service_charge_percent numeric(5,2) NOT NULL DEFAULT 0,
  service_charge numeric(12,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ETB',
  payment_method text NOT NULL DEFAULT 'pay_at_resort',
  processed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.resort_receipts(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

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

ALTER TABLE public.resort_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Operational data is managed by authenticated staff/admin roles. Public guests only use the existing reservation insert policy.
DROP POLICY IF EXISTS resort_settings_staff ON public.resort_settings;
CREATE POLICY resort_settings_staff ON public.resort_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS resort_receipts_staff ON public.resort_receipts;
CREATE POLICY resort_receipts_staff ON public.resort_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS receipt_items_staff ON public.receipt_items;
CREATE POLICY receipt_items_staff ON public.receipt_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS housekeeping_tasks_staff ON public.housekeeping_tasks;
CREATE POLICY housekeeping_tasks_staff ON public.housekeeping_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS maintenance_requests_staff ON public.maintenance_requests;
CREATE POLICY maintenance_requests_staff ON public.maintenance_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
