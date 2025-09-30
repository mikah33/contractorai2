-- Fix Estimates Tables and Policies for Supabase
-- This script ensures tables exist and have proper permissions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies to recreate them properly
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

-- Ensure estimates table has all required columns
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Disable RLS temporarily for development (enable with proper auth later)
ALTER TABLE estimate_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE estimates DISABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Create simple policies that allow all operations (for development)
-- You should replace these with proper auth-based policies in production

-- Enable RLS
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
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

-- Insert sample client if none exist
INSERT INTO clients (id, name, email, phone)
SELECT 
  'fbe8917e-20d4-432f-8007-6df16b47b209'::uuid,
  'Sample Client',
  'client@example.com',
  '555-0100'
WHERE NOT EXISTS (
  SELECT 1 FROM clients WHERE id = 'fbe8917e-20d4-432f-8007-6df16b47b209'::uuid
);

-- Insert sample project if none exist
INSERT INTO projects (id, name, description, client_id)
SELECT 
  '572b2b34-2da7-4da9-9b94-3c063c49f368'::uuid,
  'Sample Project',
  'Sample project for testing',
  'fbe8917e-20d4-432f-8007-6df16b47b209'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM projects WHERE id = '572b2b34-2da7-4da9-9b94-3c063c49f368'::uuid
);

-- Grant permissions to authenticated and anon users
GRANT ALL ON estimate_templates TO authenticated, anon;
GRANT ALL ON estimates TO authenticated, anon;
GRANT ALL ON estimate_items TO authenticated, anon;
GRANT ALL ON estimate_attachments TO authenticated, anon;
GRANT ALL ON clients TO authenticated, anon;
GRANT ALL ON projects TO authenticated, anon;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;