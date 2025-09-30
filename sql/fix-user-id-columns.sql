-- Fix user_id columns to be nullable since we're not using authentication
-- This allows the app to work without requiring login

-- Make user_id nullable in all tables
ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE receipts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE recurring_expenses ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE budget_items ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can insert own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can update own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can delete own receipts" ON receipts;

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
DROP POLICY IF EXISTS "Users can update own payments" ON payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON payments;

DROP POLICY IF EXISTS "Users can view own recurring_expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert own recurring_expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update own recurring_expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete own recurring_expenses" ON recurring_expenses;

DROP POLICY IF EXISTS "Users can view own budget_items" ON budget_items;
DROP POLICY IF EXISTS "Users can insert own budget_items" ON budget_items;
DROP POLICY IF EXISTS "Users can update own budget_items" ON budget_items;
DROP POLICY IF EXISTS "Users can delete own budget_items" ON budget_items;

DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;

-- Create new permissive policies that allow all operations
-- These work whether user is logged in or not

-- Clients policies
CREATE POLICY "Allow all operations on clients" ON clients 
FOR ALL USING (true) WITH CHECK (true);

-- Projects policies  
CREATE POLICY "Allow all operations on projects" ON projects 
FOR ALL USING (true) WITH CHECK (true);

-- Receipts policies
CREATE POLICY "Allow all operations on receipts" ON receipts 
FOR ALL USING (true) WITH CHECK (true);

-- Payments policies
CREATE POLICY "Allow all operations on payments" ON payments 
FOR ALL USING (true) WITH CHECK (true);

-- Recurring expenses policies
CREATE POLICY "Allow all operations on recurring_expenses" ON recurring_expenses 
FOR ALL USING (true) WITH CHECK (true);

-- Budget items policies
CREATE POLICY "Allow all operations on budget_items" ON budget_items 
FOR ALL USING (true) WITH CHECK (true);

-- Invoices policies
CREATE POLICY "Allow all operations on invoices" ON invoices 
FOR ALL USING (true) WITH CHECK (true);

-- Tasks table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tasks') THEN
        ALTER TABLE tasks ALTER COLUMN user_id DROP NOT NULL;
        DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
        DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
        DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
        DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
        CREATE POLICY "Allow all operations on tasks" ON tasks 
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Comments table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'comments') THEN
        ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;
        DROP POLICY IF EXISTS "Users can view own comments" ON comments;
        DROP POLICY IF EXISTS "Users can insert own comments" ON comments;
        DROP POLICY IF EXISTS "Users can update own comments" ON comments;
        DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
        CREATE POLICY "Allow all operations on comments" ON comments 
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Project team members table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'project_team_members') THEN
        ALTER TABLE project_team_members ALTER COLUMN user_id DROP NOT NULL;
        DROP POLICY IF EXISTS "Users can view own project_team_members" ON project_team_members;
        DROP POLICY IF EXISTS "Users can insert own project_team_members" ON project_team_members;
        DROP POLICY IF EXISTS "Users can update own project_team_members" ON project_team_members;
        DROP POLICY IF EXISTS "Users can delete own project_team_members" ON project_team_members;
        CREATE POLICY "Allow all operations on project_team_members" ON project_team_members 
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Success message
SELECT 'Database updated! All tables now work without authentication. user_id columns are optional.' AS message;