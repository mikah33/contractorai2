-- =====================================================
-- FIX RLS POLICIES - ALLOW ALL OPERATIONS WITHOUT AUTH
-- =====================================================

-- First, disable RLS on all tables temporarily to test
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Optional: If you want to keep RLS enabled but allow all operations
-- Uncomment the following section instead of disabling RLS above:

/*
-- Enable RLS but with permissive policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('clients', 'projects', 'receipts', 'payments', 'recurring_expenses', 'budget_items', 'invoices')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Create super permissive policies for each table
CREATE POLICY "Enable all for clients" ON clients
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for projects" ON projects
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for receipts" ON receipts
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for payments" ON payments
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for recurring_expenses" ON recurring_expenses
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for budget_items" ON budget_items
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for invoices" ON invoices
    AS PERMISSIVE FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
*/

-- Grant all permissions to anon role
GRANT ALL ON clients TO anon;
GRANT ALL ON projects TO anon;
GRANT ALL ON receipts TO anon;
GRANT ALL ON payments TO anon;
GRANT ALL ON recurring_expenses TO anon;
GRANT ALL ON budget_items TO anon;
GRANT ALL ON invoices TO anon;

-- Grant USAGE on sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Make sure anon can access the schema
GRANT USAGE ON SCHEMA public TO anon;

-- Allow anon to create new rows (INSERT with RETURNING)
GRANT INSERT, SELECT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;