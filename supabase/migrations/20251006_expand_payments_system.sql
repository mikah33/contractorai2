-- ============================================================================
-- EXPAND PAYMENTS SYSTEM - PRESERVE EXISTING DATA
-- Created: 2025-10-06
-- Purpose: Add payroll and 1099 tracking while keeping existing customer payments
-- ============================================================================

-- ============================================================================
-- STEP 1: Add payment_type to existing finance_payments table
-- This allows us to distinguish between different payment types
-- ============================================================================

-- Add payment_type column (default to 'received' for existing data)
ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'received'
CHECK (payment_type IN ('received', 'employee_payroll', 'contractor_1099'));

-- Add employee_id and contractor_id columns (will be NULL for received payments)
ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES public.contractors_1099(id) ON DELETE SET NULL;

-- Add payroll-specific fields
ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS pay_period_start DATE;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS pay_period_end DATE;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(6, 2);

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2);

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS gross_pay NUMERIC(10, 2);

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS federal_tax NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS state_tax NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS social_security NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS medicare NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS other_deductions NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS net_pay NUMERIC(10, 2);

-- Add contractor-specific fields
ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS invoice_number TEXT;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS tax_year INT;

ALTER TABLE public.finance_payments
ADD COLUMN IF NOT EXISTS check_number TEXT;

-- Rename client_name to client_id if not already done
-- (Your current structure shows client_name as UUID, which suggests it's already client_id)
-- If the column is actually named client_name, uncomment this:
-- ALTER TABLE public.finance_payments RENAME COLUMN client_name TO client_id;

-- ============================================================================
-- STEP 2: Create EMPLOYEES table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,

    -- Personal Info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,

    -- Employment Info
    employee_number TEXT UNIQUE,
    hire_date DATE NOT NULL,
    termination_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),

    -- Pay Info
    pay_type TEXT NOT NULL DEFAULT 'hourly' CHECK (pay_type IN ('hourly', 'salary')),
    pay_rate NUMERIC(10, 2) NOT NULL,
    payment_frequency TEXT DEFAULT 'bi-weekly' CHECK (payment_frequency IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')),

    -- Tax Info (encrypted in production)
    ssn_encrypted TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- STEP 3: Create CONTRACTORS_1099 table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contractors_1099 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,

    -- Business Info
    business_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,

    -- Tax Info
    ein_or_ssn_encrypted TEXT,
    tax_id_type TEXT CHECK (tax_id_type IN ('EIN', 'SSN')),

    -- Address for 1099
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,

    -- Trade/Specialty
    trade_specialty TEXT,
    contractor_type TEXT,

    -- 1099 Tracking
    requires_1099 BOOLEAN DEFAULT true,
    ytd_total NUMERIC(12, 2) DEFAULT 0.00,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- STEP 4: Create INDEXES
-- ============================================================================

-- New indexes on finance_payments
CREATE INDEX IF NOT EXISTS idx_finance_payments_payment_type ON public.finance_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_finance_payments_employee_id ON public.finance_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_contractor_id ON public.finance_payments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_tax_year ON public.finance_payments(tax_year);
CREATE INDEX IF NOT EXISTS idx_finance_payments_date ON public.finance_payments(date);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);

-- Contractors
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON public.contractors_1099(user_id);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON public.contractors_1099(status);
CREATE INDEX IF NOT EXISTS idx_contractors_ytd_total ON public.contractors_1099(ytd_total);

-- ============================================================================
-- STEP 5: Enable RLS on new tables
-- ============================================================================

-- Employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own employees" ON public.employees;
CREATE POLICY "Users can view their own employees" ON public.employees FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own employees" ON public.employees;
CREATE POLICY "Users can insert their own employees" ON public.employees FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own employees" ON public.employees;
CREATE POLICY "Users can update their own employees" ON public.employees FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own employees" ON public.employees;
CREATE POLICY "Users can delete their own employees" ON public.employees FOR DELETE USING (auth.uid() = user_id);

-- Contractors
ALTER TABLE public.contractors_1099 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own contractors" ON public.contractors_1099;
CREATE POLICY "Users can view their own contractors" ON public.contractors_1099 FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own contractors" ON public.contractors_1099;
CREATE POLICY "Users can insert their own contractors" ON public.contractors_1099 FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own contractors" ON public.contractors_1099;
CREATE POLICY "Users can update their own contractors" ON public.contractors_1099 FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own contractors" ON public.contractors_1099;
CREATE POLICY "Users can delete their own contractors" ON public.contractors_1099 FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: Create TRIGGERS
-- ============================================================================

-- Auto-update timestamps for employees
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employees_updated_at_trigger ON public.employees;
CREATE TRIGGER update_employees_updated_at_trigger
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_updated_at();

-- Auto-update timestamps for contractors
CREATE OR REPLACE FUNCTION update_contractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contractors_updated_at_trigger ON public.contractors_1099;
CREATE TRIGGER update_contractors_updated_at_trigger
    BEFORE UPDATE ON public.contractors_1099
    FOR EACH ROW
    EXECUTE FUNCTION update_contractors_updated_at();

-- Auto-update contractor YTD totals
CREATE OR REPLACE FUNCTION update_contractor_ytd_total()
RETURNS TRIGGER AS $$
DECLARE
    current_year INT;
    contractor_uuid UUID;
BEGIN
    -- Determine which contractor to update
    IF TG_OP = 'DELETE' THEN
        contractor_uuid := OLD.contractor_id;
    ELSE
        contractor_uuid := NEW.contractor_id;
    END IF;

    -- Skip if no contractor_id
    IF contractor_uuid IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Recalculate YTD total
    UPDATE contractors_1099
    SET ytd_total = (
        SELECT COALESCE(SUM(amount), 0)
        FROM finance_payments
        WHERE contractor_id = contractor_uuid
        AND payment_type = 'contractor_1099'
        AND COALESCE(tax_year, EXTRACT(YEAR FROM date)::INT) = current_year
    ),
    requires_1099 = (
        SELECT COALESCE(SUM(amount), 0) >= 600
        FROM finance_payments
        WHERE contractor_id = contractor_uuid
        AND payment_type = 'contractor_1099'
        AND COALESCE(tax_year, EXTRACT(YEAR FROM date)::INT) = current_year
    )
    WHERE id = contractor_uuid;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contractor_ytd ON public.finance_payments;
CREATE TRIGGER trigger_update_contractor_ytd
    AFTER INSERT OR UPDATE OR DELETE ON public.finance_payments
    FOR EACH ROW
    WHEN (COALESCE(NEW.payment_type, OLD.payment_type) = 'contractor_1099')
    EXECUTE FUNCTION update_contractor_ytd_total();

-- ============================================================================
-- MIGRATION COMPLETE
-- Your existing customer payment data is preserved!
-- New columns added to support payroll and 1099 tracking.
-- ============================================================================
