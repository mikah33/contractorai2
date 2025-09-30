-- =====================================================
-- SAFE VERSION - CHECKS FOR EXISTING OBJECTS
-- =====================================================

-- 1. CLIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12, 2),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RECEIPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vendor TEXT NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    notes TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'verified')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL,
    method TEXT CHECK (method IN ('cash', 'check', 'credit_card', 'bank_transfer', 'other')),
    reference TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    invoice_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RECURRING EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category TEXT NOT NULL,
    frequency TEXT CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    next_due_date DATE,
    vendor TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BUDGET ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    budgeted_amount DECIMAL(12, 2) NOT NULL,
    actual_amount DECIMAL(12, 2) DEFAULT 0,
    variance DECIMAL(12, 2) GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
    variance_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN budgeted_amount = 0 THEN 0
            ELSE ((budgeted_amount - actual_amount) / budgeted_amount * 100)
        END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE,
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_project_id ON receipts(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_user_id ON budget_items(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_project_id ON budget_items(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING POLICIES IF THEY EXIST
-- =====================================================
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

-- =====================================================
-- CREATE RLS POLICIES FOR CLIENTS
-- =====================================================
CREATE POLICY "Users can view own clients" 
    ON clients FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" 
    ON clients FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" 
    ON clients FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" 
    ON clients FOR DELETE 
    USING (auth.uid() = user_id);

-- =====================================================
-- CREATE RLS POLICIES FOR PROJECTS
-- =====================================================
CREATE POLICY "Users can view own projects" 
    ON projects FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" 
    ON projects FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
    ON projects FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
    ON projects FOR DELETE 
    USING (auth.uid() = user_id);

-- =====================================================
-- CREATE RLS POLICIES FOR RECEIPTS
-- =====================================================
CREATE POLICY "Users can view own receipts" 
    ON receipts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts" 
    ON receipts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts" 
    ON receipts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts" 
    ON receipts FOR DELETE 
    USING (auth.uid() = user_id);

-- =====================================================
-- CREATE RLS POLICIES FOR PAYMENTS
-- =====================================================
CREATE POLICY "Users can view own payments" 
    ON payments FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" 
    ON payments FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments" 
    ON payments FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payments" 
    ON payments FOR DELETE 
    USING (auth.uid() = user_id);

-- =====================================================
-- CREATE RLS POLICIES FOR RECURRING EXPENSES
-- =====================================================
CREATE POLICY "Users can view own recurring_expenses" 
    ON recurring_expenses FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring_expenses" 
    ON recurring_expenses FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring_expenses" 
    ON recurring_expenses FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring_expenses" 
    ON recurring_expenses FOR DELETE 
    USING (auth.uid() = user_id);

-- =====================================================
-- CREATE RLS POLICIES FOR BUDGET ITEMS
-- =====================================================
CREATE POLICY "Users can view own budget_items" 
    ON budget_items FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget_items" 
    ON budget_items FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget_items" 
    ON budget_items FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget_items" 
    ON budget_items FOR DELETE 
    USING (auth.uid() = user_id);

-- =====================================================
-- CREATE RLS POLICIES FOR INVOICES
-- =====================================================
CREATE POLICY "Users can view own invoices" 
    ON invoices FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" 
    ON invoices FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" 
    ON invoices FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" 
    ON invoices FOR DELETE 
    USING (auth.uid() = user_id);

-- =====================================================
-- CREATE UPDATE TIMESTAMP FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- DROP AND RECREATE TRIGGERS FOR UPDATED_AT
-- =====================================================
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_expenses_updated_at ON recurring_expenses;
CREATE TRIGGER update_recurring_expenses_updated_at 
    BEFORE UPDATE ON recurring_expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_items_updated_at ON budget_items;
CREATE TRIGGER update_budget_items_updated_at 
    BEFORE UPDATE ON budget_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();