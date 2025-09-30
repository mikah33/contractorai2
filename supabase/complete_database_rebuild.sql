-- COMPLETE DATABASE REBUILD - KEEP PROFILES, REPLACE EVERYTHING ELSE
-- This will clear all tables except profiles and rebuild with simplified structure

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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5D. FINANCE TRACKER → finance_budgets table
CREATE TABLE finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  budgeted_amount DECIMAL(12,2) NOT NULL,
  actual_amount DECIMAL(12,2) DEFAULT 0,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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

-- Create RLS policies for each table (users can only access their own data)
-- CLIENTS policies
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid()::text = user_id::text);

-- PROJECTS policies
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid()::text = user_id::text);

-- ESTIMATES policies
CREATE POLICY "Users can view own estimates" ON estimates FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own estimates" ON estimates FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own estimates" ON estimates FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own estimates" ON estimates FOR DELETE USING (auth.uid()::text = user_id::text);

-- CALCULATIONS policies
CREATE POLICY "Users can view own calculations" ON calculations FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own calculations" ON calculations FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own calculations" ON calculations FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own calculations" ON calculations FOR DELETE USING (auth.uid()::text = user_id::text);

-- FINANCE_EXPENSES policies
CREATE POLICY "Users can view own finance_expenses" ON finance_expenses FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own finance_expenses" ON finance_expenses FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own finance_expenses" ON finance_expenses FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own finance_expenses" ON finance_expenses FOR DELETE USING (auth.uid()::text = user_id::text);

-- FINANCE_PAYMENTS policies
CREATE POLICY "Users can view own finance_payments" ON finance_payments FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own finance_payments" ON finance_payments FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own finance_payments" ON finance_payments FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own finance_payments" ON finance_payments FOR DELETE USING (auth.uid()::text = user_id::text);

-- FINANCE_RECURRING policies
CREATE POLICY "Users can view own finance_recurring" ON finance_recurring FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own finance_recurring" ON finance_recurring FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own finance_recurring" ON finance_recurring FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own finance_recurring" ON finance_recurring FOR DELETE USING (auth.uid()::text = user_id::text);

-- FINANCE_BUDGETS policies
CREATE POLICY "Users can view own finance_budgets" ON finance_budgets FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own finance_budgets" ON finance_budgets FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own finance_budgets" ON finance_budgets FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own finance_budgets" ON finance_budgets FOR DELETE USING (auth.uid()::text = user_id::text);

-- CALENDAR_EVENTS policies
CREATE POLICY "Users can view own calendar_events" ON calendar_events FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own calendar_events" ON calendar_events FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own calendar_events" ON calendar_events FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own calendar_events" ON calendar_events FOR DELETE USING (auth.uid()::text = user_id::text);

-- AD_CAMPAIGNS policies
CREATE POLICY "Users can view own ad_campaigns" ON ad_campaigns FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own ad_campaigns" ON ad_campaigns FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own ad_campaigns" ON ad_campaigns FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own ad_campaigns" ON ad_campaigns FOR DELETE USING (auth.uid()::text = user_id::text);

-- =====================================
-- PHASE 4: CREATE INDEXES FOR PERFORMANCE
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
-- COMPLETION MESSAGE
-- =====================================

SELECT 'DATABASE REBUILD COMPLETE! 
✅ Profiles table preserved
✅ All old tables dropped
✅ 10 new simplified tables created
✅ All tables connected to profiles
✅ RLS policies enabled
✅ Performance indexes added
🚀 Ready for clean implementation!' as status;