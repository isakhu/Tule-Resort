-- Add reservation fields already used by the guest and manager workflows.
-- Safe to run against databases where some/all fields already exist.

BEGIN;

ALTER TABLE public.room_reservations
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pay_at_resort',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;

UPDATE public.room_reservations
SET payment_status = 'pending'
WHERE payment_status IS NULL;

ALTER TABLE public.room_reservations
  ALTER COLUMN payment_status SET DEFAULT 'pending';

COMMIT;
