-- Complete fix for finance tables to work with the application
-- This script adds missing columns and fixes data saving issues

-- 1. Fix finance_expenses table - add missing project_id column
ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'verified'));

-- 2. Fix projects table - add missing columns for finance components
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS spent DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. Update existing records with default values
UPDATE projects 
SET budget = 0 
WHERE budget IS NULL;

UPDATE projects 
SET spent = 0 
WHERE spent IS NULL;

UPDATE finance_expenses 
SET status = 'processed' 
WHERE status IS NULL;

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_finance_expenses_project_id ON finance_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_user_id ON finance_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- 5. Ensure RLS policies allow the operations
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own finance_expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Users can insert own finance_expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Users can update own finance_expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Users can delete own finance_expenses" ON finance_expenses;

-- Create new policies that work with the updated schema
CREATE POLICY "Users can view own finance_expenses" ON finance_expenses 
FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IS NULL);

CREATE POLICY "Users can insert own finance_expenses" ON finance_expenses 
FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id IS NULL);

CREATE POLICY "Users can update own finance_expenses" ON finance_expenses 
FOR UPDATE USING (auth.uid()::text = user_id::text OR user_id IS NULL);

CREATE POLICY "Users can delete own finance_expenses" ON finance_expenses 
FOR DELETE USING (auth.uid()::text = user_id::text OR user_id IS NULL);

