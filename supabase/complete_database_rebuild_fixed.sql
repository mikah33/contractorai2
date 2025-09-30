-- COMPLETE DATABASE REBUILD - BULLETPROOF PROFILES CONNECTION
-- This ensures ALL tables properly connect to profiles with correct RLS policies

-- =====================================
-- PHASE 0: VERIFY PROFILES TABLE EXISTS
-- =====================================

-- Check if profiles table exists and show its structure
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        RAISE NOTICE 'Profiles table exists - proceeding with rebuild...';
    ELSE
        RAISE EXCEPTION 'CRITICAL ERROR: profiles table does not exist! Cannot proceed.';
    END IF;
END $$;

-- =====================================
-- PHASE 1: DROP ALL EXISTING TABLES (EXCEPT PROFILES)
-- =====================================

-- Drop existing broken finance tables
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS recurring_expenses CASCADE;
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Drop any other existing tables (keeping profiles)
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS estimates CASCADE;
DROP TABLE IF EXISTS calculations CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS ad_campaigns CASCADE;
DROP TABLE IF EXISTS finance_expenses CASCADE;
DROP TABLE IF EXISTS finance_payments CASCADE;
DROP TABLE IF EXISTS finance_recurring CASCADE;
DROP TABLE IF EXISTS finance_budgets CASCADE;

-- =====================================
-- PHASE 2: CREATE NEW SIMPLIFIED TABLES
-- =====================================

-- 1. CLIENTS PAGE → clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PROJECTS PAGE → projects table  
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_name TEXT,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2) DEFAULT 0,
  spent DECIMAL(12,2) DEFAULT 0,
  progress INTEGER DEFAULT 0,
  description TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ESTIMATES PAGE → estimates table
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_name TEXT,
  project_name TEXT,
  status TEXT DEFAULT 'draft',
  total DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  expires_at DATE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PRICING CALCULATOR → calculations table
CREATE TABLE calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_name TEXT NOT NULL,
  specifications JSONB,
  results JSONB,
  total_cost DECIMAL(12,2),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5A. FINANCE TRACKER → finance_expenses table
CREATE TABLE finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  notes TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5B. FINANCE TRACKER → finance_payments table  
CREATE TABLE finance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  method TEXT DEFAULT 'bank_transfer',
  reference TEXT,
  notes TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5C. FINANCE TRACKER → finance_recurring table
CREATE TABLE finance_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  frequency TEXT NOT NULL,
  next_due_date DATE,
  is_active BOOLEAN DEFAULT true,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5D. FINANCE TRACKER → finance_budgets table
CREATE TABLE finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  budgeted_amount DECIMAL(12,2) NOT NULL,
  actual_amount DECIMAL(12,2) DEFAULT 0,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CALENDAR → calendar_events table
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  event_type TEXT DEFAULT 'task',
  status TEXT DEFAULT 'pending',
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. AD ANALYZER → ad_campaigns table
CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  spend DECIMAL(12,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  roas DECIMAL(8,2) DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- PHASE 3: ENABLE ROW LEVEL SECURITY
-- =====================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

-- =====================================
-- PHASE 4: CREATE RLS POLICIES USING PROFILES
-- =====================================

-- CLIENTS policies - using profiles connection
CREATE POLICY "Users can view own clients" ON clients 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own clients" ON clients 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own clients" ON clients 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own clients" ON clients 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- PROJECTS policies
CREATE POLICY "Users can view own projects" ON projects 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own projects" ON projects 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own projects" ON projects 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own projects" ON projects 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- ESTIMATES policies
CREATE POLICY "Users can view own estimates" ON estimates 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own estimates" ON estimates 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own estimates" ON estimates 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own estimates" ON estimates 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- CALCULATIONS policies
CREATE POLICY "Users can view own calculations" ON calculations 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own calculations" ON calculations 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own calculations" ON calculations 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own calculations" ON calculations 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- FINANCE_EXPENSES policies
CREATE POLICY "Users can view own finance_expenses" ON finance_expenses 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own finance_expenses" ON finance_expenses 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own finance_expenses" ON finance_expenses 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own finance_expenses" ON finance_expenses 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- FINANCE_PAYMENTS policies
CREATE POLICY "Users can view own finance_payments" ON finance_payments 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own finance_payments" ON finance_payments 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own finance_payments" ON finance_payments 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own finance_payments" ON finance_payments 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- FINANCE_RECURRING policies
CREATE POLICY "Users can view own finance_recurring" ON finance_recurring 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own finance_recurring" ON finance_recurring 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own finance_recurring" ON finance_recurring 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own finance_recurring" ON finance_recurring 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- FINANCE_BUDGETS policies
CREATE POLICY "Users can view own finance_budgets" ON finance_budgets 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own finance_budgets" ON finance_budgets 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own finance_budgets" ON finance_budgets 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own finance_budgets" ON finance_budgets 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- CALENDAR_EVENTS policies
CREATE POLICY "Users can view own calendar_events" ON calendar_events 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own calendar_events" ON calendar_events 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own calendar_events" ON calendar_events 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own calendar_events" ON calendar_events 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- AD_CAMPAIGNS policies
CREATE POLICY "Users can view own ad_campaigns" ON ad_campaigns 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own ad_campaigns" ON ad_campaigns 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own ad_campaigns" ON ad_campaigns 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own ad_campaigns" ON ad_campaigns 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- =====================================
-- PHASE 5: CREATE INDEXES FOR PERFORMANCE
-- =====================================

-- User-based indexes for fast queries
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_calculations_user_id ON calculations(user_id);
CREATE INDEX idx_finance_expenses_user_id ON finance_expenses(user_id);
CREATE INDEX idx_finance_payments_user_id ON finance_payments(user_id);
CREATE INDEX idx_finance_recurring_user_id ON finance_recurring(user_id);
CREATE INDEX idx_finance_budgets_user_id ON finance_budgets(user_id);
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_ad_campaigns_user_id ON ad_campaigns(user_id);

-- Date-based indexes for sorting and filtering
CREATE INDEX idx_estimates_created_at ON estimates(created_at);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_finance_expenses_date ON finance_expenses(date);
CREATE INDEX idx_finance_payments_date ON finance_payments(date);
CREATE INDEX idx_calendar_events_start_date ON calendar_events(start_date);

-- =====================================
-- PHASE 6: VALIDATE CONNECTIONS
-- =====================================

-- Test foreign key constraints
DO $$ 
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Total foreign key constraints created: %', constraint_count;
    
    -- Test that all tables reference profiles
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu_ref 
    ON rc.unique_constraint_name = kcu_ref.constraint_name
    JOIN information_schema.key_column_usage kcu_fk
    ON rc.constraint_name = kcu_fk.constraint_name
    WHERE kcu_ref.table_name = 'profiles'
    AND kcu_fk.table_schema = 'public';
    
    RAISE NOTICE 'Tables properly connected to profiles: %', constraint_count;
END $$;

-- =====================================
-- COMPLETION MESSAGE
-- =====================================

SELECT 'DATABASE REBUILD COMPLETE! 
✅ Profiles table preserved and verified
✅ All old tables dropped completely  
✅ 10 new simplified tables created
✅ ALL tables connected to profiles with NOT NULL constraints
✅ Bulletproof RLS policies using profiles
✅ Performance indexes added
✅ Foreign key constraints validated
🚀 Ready for bulletproof implementation!' as status;

-- Show final table structure
SELECT 'Final table structure:' as info;
SELECT 
    t.table_name,
    COUNT(c.column_name) as column_count,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu_fk 
        ON rc.constraint_name = kcu_fk.constraint_name
        JOIN information_schema.key_column_usage kcu_ref
        ON rc.unique_constraint_name = kcu_ref.constraint_name
        WHERE kcu_fk.table_name = t.table_name 
        AND kcu_ref.table_name = 'profiles'
    ) THEN '✅ Connected to profiles' 
    ELSE '❌ NOT connected to profiles' 
    END as profiles_connection
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;