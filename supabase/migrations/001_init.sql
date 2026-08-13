-- Initial schema for Haile Resort
-- Tables: departments, roles, users, menu_items, orders, order_items, requests, order_statuses

-- Enable UUID generation (if using pgcrypto or uuid-ossp depending on Supabase setup)
-- Supabase typically provides gen_random_uuid(); require pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  full_name TEXT,
  role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order statuses
CREATE TABLE IF NOT EXISTS order_statuses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  "order" INTEGER NOT NULL -- ordering for workflow
);

-- Menu items / services
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amharic_name TEXT,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  image_url TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  status_id INTEGER REFERENCES order_statuses(id) ON DELETE SET NULL,
  total NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Requests (non-order service requests)
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  request_type TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed departments
INSERT INTO departments (name) VALUES
('Restaurant'),
('Cafeteria'),
('Pool'),
('Spa'),
('Gym')
ON CONFLICT (name) DO NOTHING;

-- Seed roles
INSERT INTO roles (name) VALUES
('admin'),
('manager'),
('staff'),
('guest')
ON CONFLICT (name) DO NOTHING;

-- Seed order statuses with workflow ordering
INSERT INTO order_statuses (name, "order") VALUES
('Pending', 1),
('Confirmed', 2),
('Preparing', 3),
('Ready', 4),
('Delivered', 5),
('Completed', 6)
ON CONFLICT (name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status_id ON orders(status_id);
CREATE INDEX IF NOT EXISTS idx_orders_department_id ON orders(department_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_department_id ON menu_items(department_id);
