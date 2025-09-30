-- Simple Finance Tables - NO RLS, JUST TABLES
-- This will definitely work

-- Drop existing tables if they exist
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS recurring_expenses CASCADE;
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create receipts table
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  project_id UUID,
  notes TEXT,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID,
  project_id UUID,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  method VARCHAR(50),
  reference VARCHAR(255),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  invoice_id UUID,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create recurring_expenses table
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  frequency VARCHAR(20),
  next_due_date DATE NOT NULL,
  vendor VARCHAR(255),
  project_id UUID,
  is_active BOOLEAN DEFAULT true,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create budget_items table
CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  category VARCHAR(100) NOT NULL,
  budgeted_amount DECIMAL(15,2) NOT NULL,
  actual_amount DECIMAL(15,2) DEFAULT 0,
  variance DECIMAL(15,2),
  variance_percentage DECIMAL(5,2),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table (if needed by other parts)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DO NOT ENABLE RLS - Keep it simple for now
-- No policies, no restrictions, just tables

-- Test insert to verify it works
INSERT INTO receipts (vendor, date, amount, category, notes, user_id) 
VALUES ('Test Vendor', CURRENT_DATE, 100.00, 'Test', 'Test receipt', '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

SELECT 'Finance tables created successfully!' as status;