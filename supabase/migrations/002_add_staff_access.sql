-- Migration: Add staff access, permissions, room numbers, notifications, and new order statuses
-- Non-destructive: adds columns/tables and seeds new statuses. Run in Supabase SQL Editor.

-- 1) Add primary_department_id to users (do NOT remove existing department_id)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS primary_department_id INTEGER REFERENCES departments(id);

-- Note: We intentionally do NOT copy values from department_id into primary_department_id here.
-- If you want to backfill existing users to keep their current department as primary, run separately:
-- UPDATE users SET primary_department_id = department_id WHERE primary_department_id IS NULL AND department_id IS NOT NULL;

-- 2) Create staff_department_access join table for extra department access
CREATE TABLE IF NOT EXISTS staff_department_access (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, department_id)
);

-- 3) Add room_number to orders and requests for guest orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS room_number TEXT;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS room_number TEXT;

-- 4) Create staff_item_permissions to delegate item management to staff per-department
CREATE TABLE IF NOT EXISTS staff_item_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  can_manage_items BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, department_id)
);

-- 5) Insert new order statuses (non-destructive)
-- We add 'Accepted' and 'In Progress' and 'Cancelled'. These are inserted with distinct ordering numbers
-- to avoid colliding with existing seeded values. You may adjust the numeric ordering later.
INSERT INTO order_statuses (name, "order") VALUES
  ('Accepted', 7),
  ('In Progress', 8),
  ('Cancelled', 99)
ON CONFLICT (name) DO NOTHING;

-- 6) Notifications table for in-app realtime notifications (and optional sound triggers on client)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7) Indexes to support filtering
CREATE INDEX IF NOT EXISTS idx_staff_department_access_user ON staff_department_access(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_item_permissions_user ON staff_item_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_department ON notifications(department_id);

-- End of migration
