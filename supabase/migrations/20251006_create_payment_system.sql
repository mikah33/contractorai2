-- ============================================================================
-- COMPREHENSIVE PAYMENT SYSTEM FOR CONTRACTORS
-- Created: 2025-10-06
-- Purpose: Track received payments, employee payroll, and 1099 contractor payments
-- ============================================================================

-- ============================================================================
-- TABLE 1: EMPLOYEES
-- Tracks W-2 employees for payroll
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
    pay_rate NUMERIC(10, 2) NOT NULL, -- hourly rate or annual salary
    payment_frequency TEXT DEFAULT 'bi-weekly' CHECK (payment_frequency IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')),

    -- Tax Info (encrypted in production)
    ssn_encrypted TEXT, -- Store encrypted SSN
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
-- TABLE 2: CONTRACTORS (1099)
-- Tracks independent contractors for 1099 reporting
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contractors_1099 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,

    -- Business Info
    business_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,

    -- Tax Info (encrypted in production)
    ein_or_ssn_encrypted TEXT, -- Store encrypted EIN or SSN
    tax_id_type TEXT CHECK (tax_id_type IN ('EIN', 'SSN')),

    -- Address for 1099
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,

    -- Trade/Specialty
    trade_specialty TEXT,
    contractor_type TEXT, -- 'subcontractor', 'vendor', 'consultant'

    -- 1099 Tracking
    requires_1099 BOOLEAN DEFAULT true,
    ytd_total NUMERIC(12, 2) DEFAULT 0.00, -- Year-to-date total

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- TABLE 3: RECEIVED PAYMENTS (from customers)
-- Tracks payments received from clients/customers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.received_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,

    -- Payment Info
    client_id UUID, -- FK to clients table
    project_id UUID, -- FK to projects table
    invoice_id UUID, -- FK to invoices table

    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,

    -- Payment Method
    payment_method TEXT NOT NULL DEFAULT 'check' CHECK (payment_method IN ('cash', 'check', 'credit_card', 'bank_transfer', 'ach', 'other')),
    reference_number TEXT, -- check#, transaction ID, etc.

    -- Status
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- TABLE 4: EMPLOYEE PAYROLL
-- Tracks payments to W-2 employees
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employee_payroll (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- Pay Period
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE NOT NULL,

    -- Hours (if hourly)
    hours_worked NUMERIC(6, 2), -- e.g., 40.00, 37.5
    hourly_rate NUMERIC(10, 2),

    -- Amounts
    gross_pay NUMERIC(10, 2) NOT NULL,

    -- Tax Withholdings
    federal_tax NUMERIC(10, 2) DEFAULT 0.00,
    state_tax NUMERIC(10, 2) DEFAULT 0.00,
    social_security NUMERIC(10, 2) DEFAULT 0.00,
    medicare NUMERIC(10, 2) DEFAULT 0.00,
    other_deductions NUMERIC(10, 2) DEFAULT 0.00,

    -- Net Pay
    net_pay NUMERIC(10, 2) NOT NULL,

    -- Payment Method
    payment_method TEXT DEFAULT 'direct_deposit' CHECK (payment_method IN ('check', 'direct_deposit', 'cash')),
    check_number TEXT,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- TABLE 5: CONTRACTOR PAYMENTS (1099)
-- Tracks payments to independent contractors
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contractor_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    contractor_id UUID NOT NULL REFERENCES public.contractors_1099(id) ON DELETE CASCADE,

    -- Project Link
    project_id UUID, -- FK to projects table

    -- Payment Info
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,

    -- Payment Method
    payment_method TEXT NOT NULL DEFAULT 'check' CHECK (payment_method IN ('check', 'ach', 'wire', 'cash', 'other')),
    check_number TEXT,
    reference_number TEXT,

    -- Description
    description TEXT, -- What work was this for?
    invoice_number TEXT, -- Contractor's invoice #

    -- Tax Year (for 1099 reporting)
    tax_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Employees
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_employee_number ON public.employees(employee_number);

-- Contractors
CREATE INDEX idx_contractors_user_id ON public.contractors_1099(user_id);
CREATE INDEX idx_contractors_status ON public.contractors_1099(status);
CREATE INDEX idx_contractors_ytd_total ON public.contractors_1099(ytd_total);

-- Received Payments
CREATE INDEX idx_received_payments_user_id ON public.received_payments(user_id);
CREATE INDEX idx_received_payments_client_id ON public.received_payments(client_id);
CREATE INDEX idx_received_payments_project_id ON public.received_payments(project_id);
CREATE INDEX idx_received_payments_payment_date ON public.received_payments(payment_date);
CREATE INDEX idx_received_payments_status ON public.received_payments(status);

-- Employee Payroll
CREATE INDEX idx_employee_payroll_user_id ON public.employee_payroll(user_id);
CREATE INDEX idx_employee_payroll_employee_id ON public.employee_payroll(employee_id);
CREATE INDEX idx_employee_payroll_payment_date ON public.employee_payroll(payment_date);
CREATE INDEX idx_employee_payroll_pay_period ON public.employee_payroll(pay_period_start, pay_period_end);

-- Contractor Payments
CREATE INDEX idx_contractor_payments_user_id ON public.contractor_payments(user_id);
CREATE INDEX idx_contractor_payments_contractor_id ON public.contractor_payments(contractor_id);
CREATE INDEX idx_contractor_payments_project_id ON public.contractor_payments(project_id);
CREATE INDEX idx_contractor_payments_payment_date ON public.contractor_payments(payment_date);
CREATE INDEX idx_contractor_payments_tax_year ON public.contractor_payments(tax_year);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own employees" ON public.employees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own employees" ON public.employees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own employees" ON public.employees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own employees" ON public.employees FOR DELETE USING (auth.uid() = user_id);

-- Contractors
ALTER TABLE public.contractors_1099 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own contractors" ON public.contractors_1099 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contractors" ON public.contractors_1099 FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contractors" ON public.contractors_1099 FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contractors" ON public.contractors_1099 FOR DELETE USING (auth.uid() = user_id);

-- Received Payments
ALTER TABLE public.received_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own received payments" ON public.received_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own received payments" ON public.received_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own received payments" ON public.received_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own received payments" ON public.received_payments FOR DELETE USING (auth.uid() = user_id);

-- Employee Payroll
ALTER TABLE public.employee_payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own employee payroll" ON public.employee_payroll FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own employee payroll" ON public.employee_payroll FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own employee payroll" ON public.employee_payroll FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own employee payroll" ON public.employee_payroll FOR DELETE USING (auth.uid() = user_id);

-- Contractor Payments
ALTER TABLE public.contractor_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own contractor payments" ON public.contractor_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contractor payments" ON public.contractor_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contractor payments" ON public.contractor_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contractor payments" ON public.contractor_payments FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS (Auto-update timestamps)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors_1099
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_received_payments_updated_at BEFORE UPDATE ON public.received_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_payroll_updated_at BEFORE UPDATE ON public.employee_payroll
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_payments_updated_at BEFORE UPDATE ON public.contractor_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Update Contractor YTD Totals
-- Automatically recalculates year-to-date totals when payments are added/updated
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contractor_ytd_total()
RETURNS TRIGGER AS $$
DECLARE
    current_year INT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Recalculate YTD total for the contractor
    UPDATE contractors_1099
    SET ytd_total = (
        SELECT COALESCE(SUM(amount), 0)
        FROM contractor_payments
        WHERE contractor_id = NEW.contractor_id
        AND tax_year = current_year
    )
    WHERE id = NEW.contractor_id;

    -- Update requires_1099 flag if total exceeds $600
    UPDATE contractors_1099
    SET requires_1099 = (ytd_total >= 600)
    WHERE id = NEW.contractor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contractor_ytd
    AFTER INSERT OR UPDATE ON public.contractor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_contractor_ytd_total();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
