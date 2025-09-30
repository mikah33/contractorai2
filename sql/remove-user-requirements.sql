-- =====================================================
-- REMOVE USER_ID REQUIREMENTS FROM ALL TABLES
-- This allows the app to work without authentication
-- =====================================================

-- Drop all existing policies first
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

-- Make user_id nullable in all tables
ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE receipts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE recurring_expenses ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE budget_items ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN user_id DROP NOT NULL;

-- Create new policies that allow all operations without user checks
CREATE POLICY "Allow all operations on clients" 
    ON clients FOR ALL 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow all operations on projects" 
    ON projects FOR ALL 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow all operations on receipts" 
    ON receipts FOR ALL 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow all operations on payments" 
    ON payments FOR ALL 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow all operations on recurring_expenses" 
    ON recurring_expenses FOR ALL 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow all operations on budget_items" 
    ON budget_items FOR ALL 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow all operations on invoices" 
    ON invoices FOR ALL 
    USING (true) 
    WITH CHECK (true);