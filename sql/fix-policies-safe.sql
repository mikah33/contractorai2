-- Safe script to fix policies - drops existing ones first
-- This makes all tables work without authentication

-- First, drop ALL existing policies for each table
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on clients
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'clients'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON clients', pol.policyname);
    END LOOP;
    
    -- Drop all policies on projects
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
    END LOOP;
    
    -- Drop all policies on receipts
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'receipts'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON receipts', pol.policyname);
    END LOOP;
    
    -- Drop all policies on payments
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'payments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON payments', pol.policyname);
    END LOOP;
    
    -- Drop all policies on recurring_expenses
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'recurring_expenses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON recurring_expenses', pol.policyname);
    END LOOP;
    
    -- Drop all policies on budget_items
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'budget_items'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON budget_items', pol.policyname);
    END LOOP;
    
    -- Drop all policies on invoices
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'invoices'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON invoices', pol.policyname);
    END LOOP;
    
    -- Drop all policies on tasks if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tasks') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', pol.policyname);
        END LOOP;
    END IF;
    
    -- Drop all policies on comments if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'comments') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'comments'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON comments', pol.policyname);
        END LOOP;
    END IF;
    
    -- Drop all policies on project_team_members if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'project_team_members') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'project_team_members'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON project_team_members', pol.policyname);
        END LOOP;
    END IF;
END $$;

-- Make user_id nullable in all tables (safe - won't error if already nullable)
DO $$
BEGIN
    -- Only alter if the column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE receipts ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recurring_expenses' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE recurring_expenses ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budget_items' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE budget_items ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE invoices ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    
    -- Handle tasks table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE tasks ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    
    -- Handle comments table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    
    -- Handle project_team_members table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_team_members' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE project_team_members ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- Now create new permissive policies
-- These allow all operations whether logged in or not

CREATE POLICY "public_access_clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_receipts" ON receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_recurring_expenses" ON recurring_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_budget_items" ON budget_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access_invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);

-- Create policies for optional tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tasks') THEN
        EXECUTE 'CREATE POLICY "public_access_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true)';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'comments') THEN
        EXECUTE 'CREATE POLICY "public_access_comments" ON comments FOR ALL USING (true) WITH CHECK (true)';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'project_team_members') THEN
        EXECUTE 'CREATE POLICY "public_access_project_team_members" ON project_team_members FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- Success message
SELECT 'Success! All policies updated. Tables now work without authentication.' AS message;