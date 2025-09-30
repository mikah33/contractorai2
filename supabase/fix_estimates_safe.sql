-- Safe Fix for Estimates Tables - Checks before creating
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='user_id') THEN
    ALTER TABLE estimates ADD COLUMN user_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='created_by') THEN
    ALTER TABLE estimates ADD COLUMN created_by UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='updated_by') THEN
    ALTER TABLE estimates ADD COLUMN updated_by UUID;
  END IF;
END $$;

-- Drop all existing policies first (safe - won't error if they don't exist)
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Allow all operations on estimate_templates" ON estimate_templates;
  DROP POLICY IF EXISTS "Allow all operations on estimates" ON estimates;
  DROP POLICY IF EXISTS "Allow all operations on estimate_items" ON estimate_items;
  DROP POLICY IF EXISTS "Allow all operations on estimate_attachments" ON estimate_attachments;
  DROP POLICY IF EXISTS "Allow all operations on clients" ON clients;
  DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
  
  -- Also drop old policies
  DROP POLICY IF EXISTS "Allow public read for estimate_templates" ON estimate_templates;
  DROP POLICY IF EXISTS "Allow authenticated insert for estimate_templates" ON estimate_templates;
  DROP POLICY IF EXISTS "Allow authenticated update for estimate_templates" ON estimate_templates;
  DROP POLICY IF EXISTS "Allow authenticated delete for estimate_templates" ON estimate_templates;
  DROP POLICY IF EXISTS "Allow read own estimates" ON estimates;
  DROP POLICY IF EXISTS "Allow insert estimates" ON estimates;
  DROP POLICY IF EXISTS "Allow update own estimates" ON estimates;
  DROP POLICY IF EXISTS "Allow delete own estimates" ON estimates;
  DROP POLICY IF EXISTS "Allow read estimate_items" ON estimate_items;
  DROP POLICY IF EXISTS "Allow insert estimate_items" ON estimate_items;
  DROP POLICY IF EXISTS "Allow update estimate_items" ON estimate_items;
  DROP POLICY IF EXISTS "Allow delete estimate_items" ON estimate_items;
  DROP POLICY IF EXISTS "Allow read estimate_attachments" ON estimate_attachments;
  DROP POLICY IF EXISTS "Allow insert estimate_attachments" ON estimate_attachments;
  DROP POLICY IF EXISTS "Allow delete estimate_attachments" ON estimate_attachments;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignore errors if policies don't exist
END $$;

-- Enable RLS on all tables
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create new permissive policies for development
-- These allow all operations - replace with proper auth in production
CREATE POLICY "Allow all operations on estimate_templates" ON estimate_templates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on estimates" ON estimates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on estimate_items" ON estimate_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on estimate_attachments" ON estimate_attachments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on clients" ON clients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on projects" ON projects
  FOR ALL USING (true) WITH CHECK (true);

-- Insert sample data if it doesn't exist
INSERT INTO clients (id, name, email, phone)
SELECT 
  'fbe8917e-20d4-432f-8007-6df16b47b209'::uuid,
  'Sample Client',
  'client@example.com',
  '555-0100'
WHERE NOT EXISTS (
  SELECT 1 FROM clients WHERE id = 'fbe8917e-20d4-432f-8007-6df16b47b209'::uuid
);

INSERT INTO projects (id, name, description, client_id)
SELECT 
  '572b2b34-2da7-4da9-9b94-3c063c49f368'::uuid,
  'Sample Project',
  'Sample project for testing',
  'fbe8917e-20d4-432f-8007-6df16b47b209'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM projects WHERE id = '572b2b34-2da7-4da9-9b94-3c063c49f368'::uuid
);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Test the setup
SELECT 'Setup complete! Tables configured:' as status
UNION ALL
SELECT '✓ estimates table: ' || COUNT(*)::text || ' rows' FROM estimates
UNION ALL
SELECT '✓ estimate_items table: ' || COUNT(*)::text || ' rows' FROM estimate_items
UNION ALL
SELECT '✓ clients table: ' || COUNT(*)::text || ' rows' FROM clients
UNION ALL
SELECT '✓ projects table: ' || COUNT(*)::text || ' rows' FROM projects
UNION ALL
SELECT '✓ estimate_templates table: ' || COUNT(*)::text || ' rows' FROM estimate_templates;